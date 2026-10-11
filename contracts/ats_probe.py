# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *

# Feasibility probe: can GenLayer validators fetch public ATS job APIs
# (Greenhouse, Lever, Ashby) and agree on normalized posting facts?


def _url_for(ats: str, board: str, job_id: str) -> str:
    if ats == "greenhouse":
        return f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}?pay_transparency=true"
    if ats == "lever":
        return f"https://api.lever.co/v0/postings/{board}/{job_id}"
    if ats == "ashby":
        return f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true"
    raise gl.vm.UserError("unsupported ats")


def _status_of(resp) -> int:
    return int(getattr(resp, "status", getattr(resp, "status_code", 0)))


class AtsProbe(gl.Contract):
    results: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.write
    def probe(self, ats: str, board: str, job_id: str) -> None:
        url = _url_for(ats, board, job_id)

        def fetch() -> str:
            resp = gl.nondet.web.get(url)
            status = _status_of(resp)
            out = {"http": status, "live": False}
            if status != 200 or resp.body is None:
                return json.dumps(out, sort_keys=True)
            data = json.loads(resp.body.decode("utf-8"))
            if ats == "ashby":
                match = [j for j in data.get("jobs", []) if j.get("id") == job_id]
                if not match:
                    return json.dumps(out, sort_keys=True)
                data = match[0]
                comp = (data.get("compensation") or {}).get("summaryComponents") or []
                sal = [c for c in comp if c.get("compensationType") == "Salary"]
                out["pay"] = [sal[0].get("minValue"), sal[0].get("maxValue"), sal[0].get("currencyCode")] if sal else None
                out["title"] = data.get("title")
            elif ats == "greenhouse":
                rng = data.get("pay_input_ranges") or []
                out["pay"] = [rng[0]["min_cents"] // 100, rng[0]["max_cents"] // 100, rng[0]["currency_type"]] if rng else None
                out["title"] = data.get("title")
            else:
                sr = data.get("salaryRange")
                out["pay"] = [sr.get("min"), sr.get("max"), sr.get("currency")] if sr else None
                out["title"] = data.get("text")
            out["live"] = True
            return json.dumps(out, sort_keys=True)

        self.results[f"{ats}:{board}:{job_id}"] = gl.eq_principle.strict_eq(fetch)

    @gl.public.view
    def get_results(self) -> dict:
        return {k: v for k, v in self.results.items()}

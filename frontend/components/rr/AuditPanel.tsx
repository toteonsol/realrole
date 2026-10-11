"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePostings, useRealRole, useStats, useTx } from "@/lib/hooks/useRealRole";
import { parsePostingUrl } from "@/lib/realrole/format";
import { COMPANIES, fetchBoard } from "@/lib/realrole/companies";
import { PostingCard, TxProgress, VerdictBadge } from "./shared";

/** Companies we pull fresh, not-yet-audited roles from for one-click live audits. */
const FRESH_FROM = ["discord", "palantir", "okx", "robinhood", "polymarket", "anchorage"];

const STORED_EXAMPLES = [
  { label: "Uniswap", sub: "Staff Backend Eng", url: "https://jobs.ashbyhq.com/uniswap/f1dab839-ecb6-4061-b475-b5d8cf264adb" },
  { label: "Ripple", sub: "Chicago, IL", url: "https://job-boards.greenhouse.io/ripple/jobs/8209410" },
  { label: "Gemini", sub: "New York", url: "https://job-boards.greenhouse.io/gemini/jobs/7951043" },
  { label: "Binance", sub: "Taipei", url: "https://jobs.lever.co/binance/8cd93838-3c12-4386-8dc2-8dfe69873e27" },
];

const SOURCES = ["Greenhouse", "Lever", "Ashby", "schema.org JobPosting"];

export function AuditPanel() {
  const contract = useRealRole();
  const tx = useTx();
  const stats = useStats();
  const onRecord = usePostings();

  // Oldest live role per company that is NOT on the record yet: clicking one goes straight to the wallet.
  const fresh = useQuery({
    queryKey: ["fresh-picks", (onRecord.data ?? []).length],
    enabled: !!onRecord.data,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const recorded = new Set((onRecord.data ?? []).map((p) => p.key));
      const picks = await Promise.all(
        FRESH_FROM.map(async (board) => {
          const c = COMPANIES.find((x) => x.board === board)!;
          try {
            const jobs = (await fetchBoard(c)).filter((j) => j.postedTs && !recorded.has(`${c.ats}:${c.board}:${j.id}`));
            jobs.sort((a, b) => a.postedTs - b.postedTs);
            const j = jobs[0];
            if (!j) return null;
            const days = Math.floor((Date.now() / 1000 - j.postedTs) / 86400);
            return { label: c.name, sub: j.title, age: days, ats: c.ats, board: c.board, id: j.id, url: j.url };
          } catch {
            return null;
          }
        }),
      );
      return picks.filter(Boolean) as { label: string; sub: string; age: number; ats: string; board: string; id: string; url: string }[];
    },
  });
  const [input, setInput] = useState("");
  const parsed = parsePostingUrl(input);
  const ghCompanyPage = /gh_jid=/.test(input) && !parsed;

  const existing = useQuery({
    queryKey: ["posting", parsed?.ats, parsed?.board, parsed?.jobId, tx.outcome?.hash],
    queryFn: () => contract!.posting(parsed!.ats, parsed!.board, parsed!.jobId),
    enabled: !!contract && !!parsed,
  });

  useEffect(() => {
    if (!tx.busy && tx.stage !== "estimating" && tx.stage !== "signing") tx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const cooldown = stats.data?.cooldown_s ?? 0;
  const reauditAt = existing.data ? existing.data.last_audit_ts + cooldown : 0;
  const now = Math.floor(Date.now() / 1000);
  const coolingDown = !!existing.data && now < reauditAt;
  const waitText = coolingDown
    ? (reauditAt - now >= 3600 ? `${Math.ceil((reauditAt - now) / 3600)}h` : `${Math.ceil((reauditAt - now) / 60)}m`)
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed) return;
    await tx.run("audit_posting", [parsed.ats, parsed.board, parsed.jobId]);
    existing.refetch();
  };

  return (
    <section aria-labelledby="audit-h">
      <div className="card card-glow p-5 sm:p-8">
        <p className="eyebrow">Step into the desk</p>
        <h2 id="audit-h" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Paste any job link. Get a verdict on the record.</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Independent validators each fetch the posting from its source, an AI reads the messy bits, and the contract decides.
          Takes about a minute.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="posting-url" className="sr-only">Job posting URL</label>
          <div className="relative flex-1">
            <span className="mono pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true">›</span>
            <input
              id="posting-url"
              className="field mono !pl-9"
              placeholder="https://job-boards.greenhouse.io/company/jobs/123"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button className="btn btn-primary px-6 py-3.5 text-base" disabled={!parsed || tx.busy || coolingDown} type="submit">
            {tx.busy ? "Validators working…" : coolingDown ? `Re-audit in ${waitText}` : existing.data ? "Re-audit →" : "Run the audit →"}
          </button>
        </form>

        <div className="mono mt-3 min-h-5 text-xs text-ink-3">
          {parsed ? (
            <span className="text-good">
              ✓ {parsed.label}
              {parsed.ats !== "jsonld" && <span className="text-ink-3"> · board {parsed.board} · job {parsed.jobId}</span>}
            </span>
          ) : ghCompanyPage ? (
            <span className="text-warn">Company-hosted Greenhouse page. Use the job-boards.greenhouse.io link instead.</span>
          ) : input ? (
            <span className="text-warn">Paste a Greenhouse, Lever or Ashby job link, or an https careers page with JobPosting data.</span>
          ) : (
            <span>Reads from {SOURCES.join(" · ")}</span>
          )}
        </div>

        {!input && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Run a live audit · one click, your wallet signs</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {fresh.isLoading || !fresh.data ? (
                <p className="mono text-xs text-ink-3 sm:col-span-3">finding real roles that aren&apos;t on the record yet…</p>
              ) : (
                fresh.data.map((f) => (
                  <button
                    key={f.url}
                    type="button"
                    disabled={tx.busy}
                    onClick={async () => {
                      setInput(f.url);
                      await tx.run("audit_posting", [f.ats, f.board, f.id]);
                    }}
                    className="group rounded-xl border border-brand/40 bg-sunken px-3 py-2.5 text-left transition hover:border-brand disabled:opacity-50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold group-hover:text-brand">{f.label}</span>
                      <span className={`mono text-[0.65rem] ${f.age > 90 ? "text-warn" : "text-ink-3"}`}>{f.age > 90 ? "👻 " : ""}{f.age}d open</span>
                    </span>
                    <span className="block truncate text-xs text-ink-3">{f.sub}</span>
                    <span className="mt-1 block text-[0.7rem] font-bold text-brand">Audit live →</span>
                  </button>
                ))
              )}
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-3">Or look up a stored verdict · free, no wallet</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STORED_EXAMPLES.map((ex) => (
                <button
                  key={ex.url}
                  type="button"
                  onClick={() => setInput(ex.url)}
                  className="group rounded-xl border border-line bg-sunken px-3 py-2.5 text-left transition hover:border-ink-3"
                >
                  <span className="block text-sm font-bold">{ex.label}</span>
                  <span className="block text-xs text-ink-3">{ex.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <TxProgress tx={tx} />

      {tx.stage === "accepted" && (typeof tx.outcome?.returned === "string" || existing.data?.verdict) && (
        <div className="rise mt-6 flex flex-wrap items-center gap-4">
          <span className="eyebrow">Consensus verdict</span>
          <VerdictBadge verdict={typeof tx.outcome?.returned === "string" ? tx.outcome.returned : existing.data!.verdict} size="lg" />
        </div>
      )}

      {existing.data && (
        <div className="mt-6 rise">
          {!tx.stage && (
            <p className="mb-3 rounded-xl border border-line-2 bg-sunken px-4 py-3 text-sm text-ink-2">
              <strong className="text-ink">Already on the record.</strong> You&apos;re reading a verdict validators stored
              earlier (free, no wallet). {coolingDown ? (
                <>A fresh re-audit opens in {waitText} (each posting can be re-checked every {Math.round(cooldown / 3600)}h). Pick a new job from <strong className="text-ink">Browse live jobs</strong> to see a live audit now.</>
              ) : (
                <><strong className="text-ink">Re-audit</strong> runs a fresh check: your wallet signs a transaction (about 0.0003 GEN) and validators re-read the posting from its source.</>
              )}
            </p>
          )}
          <PostingCard p={existing.data} featured />
        </div>
      )}
      {parsed && !existing.isLoading && !existing.data && !tx.stage && (
        <p className="mt-4 rounded-xl border border-line-2 bg-sunken px-4 py-3 text-sm text-ink-2">
          <strong className="text-ink">Not on the record yet.</strong> Running the audit asks your wallet to sign a transaction
          (about 0.0003 GEN). Validators then fetch this posting from its source and settle a verdict in about a minute.
        </p>
      )}
    </section>
  );
}

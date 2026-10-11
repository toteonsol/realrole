"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { COMPANIES, fetchBoard, type Company, type Segment } from "@/lib/realrole/companies";
import { usePostings, useTx } from "@/lib/hooks/useRealRole";
import { TxProgress, VerdictBadge } from "./shared";

function ageLabel(ts: number): { text: string; stale: boolean } {
  if (!ts) return { text: "—", stale: false };
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  const stale = days > 90;
  if (days < 1) return { text: "today", stale };
  if (days < 60) return { text: `${days}d`, stale };
  if (days < 730) return { text: `${Math.round(days / 30)}mo`, stale };
  return { text: `${(days / 365).toFixed(1)}y`, stale };
}

export function Explorer() {
  const [segment, setSegment] = useState<Segment>("web2");
  const [company, setCompany] = useState<Company>(COMPANIES[0]);
  const [q, setQ] = useState("");
  const [oldestFirst, setOldestFirst] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const tx = useTx();
  const onRecord = usePostings();

  const board = useQuery({
    queryKey: ["board", company.ats, company.board],
    queryFn: () => fetchBoard(company),
    staleTime: 5 * 60_000,
  });

  const recorded = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of onRecord.data ?? []) m.set(p.key, p.verdict);
    return m;
  }, [onRecord.data]);

  const jobs = useMemo(() => {
    const list = (board.data ?? []).filter(
      (j) => !q || `${j.title} ${j.location}`.toLowerCase().includes(q.toLowerCase()),
    );
    list.sort((a, b) => (oldestFirst ? a.postedTs - b.postedTs : b.postedTs - a.postedTs));
    return list.slice(0, 60);
  }, [board.data, q, oldestFirst]);

  const stale = (board.data ?? []).filter((j) => ageLabel(j.postedTs).stale).length;

  const audit = async (id: string) => {
    setActive(id);
    await tx.run("audit_posting", [company.ats, company.board, id]);
  };

  return (
    <section aria-labelledby="explore-h">
      <p className="eyebrow">Don&apos;t know where to start?</p>
      <h2 id="explore-h" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Browse real open jobs, live</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        These lists come straight from each company&apos;s public job board, right now. Sort by oldest to find roles that have
        been &ldquo;open&rdquo; for months or years, then put any of them on the record.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["web2", "web3"] as Segment[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSegment(s);
              setCompany(COMPANIES.find((c) => c.segment === s)!);
            }}
            aria-pressed={segment === s}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${segment === s ? "bg-ink text-paper" : "border border-line-2 text-ink-2"}`}
          >
            {s === "web2" ? "Web2 companies" : "Web3 companies"}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {COMPANIES.filter((c) => c.segment === segment).map((c) => (
          <button
            key={c.board}
            onClick={() => setCompany(c)}
            aria-pressed={company.board === c.board}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${company.board === c.board ? "border-brand text-brand" : "border-line hover:border-ink-3"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="text-lg font-bold">{company.name}</p>
            <p className="mono text-xs text-ink-3">
              {board.isLoading ? "reading job board…" : `${board.data?.length ?? 0} open roles · `}
              {!board.isLoading && <span className={stale ? "text-warn" : ""}>{stale} open 90+ days</span>}
              {" · via "}{company.ats}
            </p>
          </div>
          <div className="flex gap-2">
            <input className="field !w-44 !py-2 text-sm" placeholder="Filter roles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter roles" />
            <button className="btn btn-ghost !py-2 text-xs" onClick={() => setOldestFirst((o) => !o)}>
              {oldestFirst ? "Oldest first" : "Newest first"}
            </button>
          </div>
        </div>
        {board.isError ? (
          <p className="p-6 text-sm text-bad">Couldn&apos;t read this job board right now.</p>
        ) : (
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {jobs.map((j) => {
              const key = `${company.ats}:${company.board}:${j.id}`;
              const verdict = recorded.get(key);
              const age = ageLabel(j.postedTs);
              return (
                <li key={j.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto]">
                  <div className="min-w-0">
                    <a href={j.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">{j.title}</a>
                    <p className="truncate text-xs text-ink-3">{j.location}</p>
                  </div>
                  <span className={`mono text-xs ${age.stale ? "font-bold text-warn" : "text-ink-3"}`} title="Time since first posted">
                    {age.stale ? "👻 " : ""}{age.text}
                  </span>
                  {verdict ? (
                    <VerdictBadge verdict={verdict} />
                  ) : (
                    <button className="btn btn-ghost !px-3 !py-1.5 text-xs" disabled={tx.busy} onClick={() => audit(j.id)}>
                      {tx.busy && active === j.id ? "Auditing…" : "Put on record →"}
                    </button>
                  )}
                </li>
              );
            })}
            {!board.isLoading && !jobs.length && <li className="p-6 text-sm text-ink-3">No roles match.</li>}
          </ul>
        )}
      </div>
      {active && <TxProgress tx={tx} />}
      {active && tx.stage === "accepted" && recorded.get(`${company.ats}:${company.board}:${active}`) && (
        <div className="rise mt-5 flex flex-wrap items-center gap-4">
          <span className="eyebrow">Consensus verdict</span>
          <VerdictBadge verdict={recorded.get(`${company.ats}:${company.board}:${active}`)!} size="lg" />
          <span className="text-sm text-ink-2">
            {(board.data ?? []).find((j) => j.id === active)?.title}: now on the record for anyone to verify.
          </span>
        </div>
      )}
    </section>
  );
}

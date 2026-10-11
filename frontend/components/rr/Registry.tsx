"use client";

import { useMemo, useState } from "react";
import type { Verdict } from "@/lib/contracts/RealRole";
import { usePostings, useScorecards } from "@/lib/hooks/useRealRole";
import { VERDICT_INFO } from "@/lib/realrole/format";
import { Empty, Loading, PostingCard } from "./shared";

const FILTERS: (Verdict | "ALL")[] = ["ALL", "COMPLIANT", "MISSING_RANGE", "TOO_WIDE", "NO_RANGE_UNREGULATED", "CLOSED"];

export function Registry() {
  const postings = usePostings();
  const cards = useScorecards();
  const [filter, setFilter] = useState<Verdict | "ALL">("ALL");

  const ranked = useMemo(() => {
    return (cards.data ?? [])
      .map((c) => {
        const open = c.postings - c.CLOSED;
        const judged = c.COMPLIANT + c.MISSING_RANGE + c.TOO_WIDE + c.INVALID_RANGE;
        const score = judged > 0 ? Math.round((c.COMPLIANT / judged) * 100) : null;
        return { ...c, open, score };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.postings - a.postings);
  }, [cards.data]);

  const shown = useMemo(
    () => (postings.data ?? []).filter((p) => filter === "ALL" || p.verdict === filter),
    [postings.data, filter],
  );

  return (
    <div className="grid gap-12">
      <section aria-labelledby="score-h">
        <p className="eyebrow">Leaderboard</p>
        <h2 id="score-h" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Who publishes honest pay?</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Honesty score = postings with an honest range ÷ postings where a pay rule applies or a range is shown. Each posting
          counts once, under its latest verdict.
        </p>
        {cards.isLoading ? <div className="mt-5"><Loading /></div> : !ranked.length ? (
          <div className="mt-5"><Empty>No employers on the record yet.</Empty></div>
        ) : (
          <ol className="mt-6 grid gap-3">
            {ranked.map((c, idx) => (
              <li key={c.board} className="card rise grid items-center gap-4 p-4 sm:grid-cols-[48px_1.3fr_2fr_auto] sm:p-5" style={{ animationDelay: `${idx * 60}ms` }}>
                <span className="mono text-2xl font-black text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{c.board.split(":")[1] ?? c.board}</p>
                  <p className="eyebrow !text-[0.62rem]">{c.board.split(":")[0]} · {c.postings} posting{c.postings === 1 ? "" : "s"}</p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-ink-3">Honesty</span>
                    <span className={`mono text-base font-black ${c.score === null ? "text-ink-3" : c.score >= 80 ? "text-good" : c.score >= 40 ? "text-warn" : "text-bad"}`}>
                      {c.score === null ? "n/a" : `${c.score}%`}
                    </span>
                  </div>
                  <div className="meter mt-1.5"><span style={{ width: `${c.score ?? 0}%` }} /></div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs sm:justify-end">
                  {c.MISSING_RANGE > 0 && <span className="tone-bad rounded-md px-2 py-0.5 font-bold">{c.MISSING_RANGE} missing pay</span>}
                  {c.TOO_WIDE > 0 && <span className="tone-warn rounded-md px-2 py-0.5 font-bold">{c.TOO_WIDE} too wide</span>}
                  {c.STALE > 0 && <span className="tone-warn rounded-md px-2 py-0.5 font-bold">👻 {c.STALE} open 90d+</span>}
                  {c.PLEDGES_KEPT + c.PLEDGES_BROKEN > 0 && (
                    <span className="rounded-md border border-line-2 px-2 py-0.5">
                      pledges <span className="text-good">{c.PLEDGES_KEPT}✓</span> <span className="text-bad">{c.PLEDGES_BROKEN}✗</span>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="postings-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The record</p>
            <h2 id="postings-h" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Every verdict, with receipts</h2>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by verdict">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${filter === f ? "border-brand bg-brand text-brand-ink" : "border-line-2 text-ink-2 hover:border-ink-3"}`}
              >
                {f === "ALL" ? "All" : VERDICT_INFO[f].label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {postings.isLoading ? <Loading /> : shown.length ? shown.map((p) => <PostingCard key={p.key} p={p} />) : (
            <Empty>No postings match this filter.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Posting, PledgeStatus, Verdict } from "@/lib/contracts/RealRole";
import type { TxState } from "@/lib/hooks/useRealRole";
import { EXPLORER_URL } from "@/lib/genlayer/client";
import {
  FLAG_INFO, PLEDGE_INFO, VERDICT_INFO, formatDate, formatPay, publicPostingUrl, timeAgo,
} from "@/lib/realrole/format";

const STAMP_TEXT: Record<Verdict, string> = {
  COMPLIANT: "Honest pay",
  MISSING_RANGE: "Missing pay",
  TOO_WIDE: "Range too wide",
  INVALID_RANGE: "Invalid range",
  NO_RANGE_UNREGULATED: "No range · no rule",
  CLOSED: "Closed",
};

export function Pill({ tone, children, title }: { tone: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`tone-${tone} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold`}>
      {children}
    </span>
  );
}

export function VerdictBadge({ verdict, size = "sm" }: { verdict: Verdict | string; size?: "sm" | "lg" }) {
  const info = VERDICT_INFO[verdict as Verdict];
  if (!info) return <span className="stamp tone-neutral">{verdict || "Unaudited"}</span>;
  return (
    <span title={info.help} className={`stamp tone-${info.tone} ${size === "lg" ? "stamp-lg" : ""}`}>
      {STAMP_TEXT[verdict as Verdict]}
    </span>
  );
}

export function PledgeBadge({ status }: { status: PledgeStatus }) {
  const info = PLEDGE_INFO[status] ?? { label: status, tone: "neutral" };
  return <span className={`stamp tone-${info.tone}`}>{info.label}</span>;
}

export function Flags({ flags }: { flags: string }) {
  const list = flags.split(",").filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((f) => (
        <span
          key={f}
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${f === "STALE" ? "tone-warn" : "border border-line-2 text-ink-2"}`}
        >
          {f === "STALE" ? "👻 " : ""}{FLAG_INFO[f] ?? f}
        </span>
      ))}
    </div>
  );
}

export function TxLink({ hash }: { hash: string }) {
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  return (
    <a className="mono text-ink-2 underline decoration-line-2 underline-offset-2 hover:text-brand" href={`${EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer">
      {short} ↗
    </a>
  );
}

const STAGES = [
  { key: "estimating", label: "Prepare" },
  { key: "signing", label: "Sign" },
  { key: "deciding", label: "Validators deciding" },
  { key: "accepted", label: "Consensus" },
];

/** The consensus view: validator nodes orbit the posting while it is scanned, then light up as they agree. */
export function TxProgress({ tx }: { tx: TxState & { retry?: () => unknown } }) {
  if (!tx.stage) return null;
  const current = tx.stage === "failed" ? -1 : STAGES.findIndex((s) => s.key === tx.stage);
  const voteList = tx.outcome?.votes ? Object.values(tx.outcome.votes) : [];
  const active = voteList.filter((v) => v !== "idle");
  const agree = active.filter((v) => v === "agree").length;
  const deciding = tx.stage === "deciding";
  const done = tx.stage === "accepted";
  const nodes = done && voteList.length ? voteList : Array(5).fill(deciding ? "working" : "idle");

  return (
    <div className="card card-glow mt-5 overflow-hidden p-5 rise" role="status" aria-live="polite">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-36 w-36 shrink-0" aria-hidden="true">
          <div className="absolute inset-[38px] overflow-hidden rounded-xl border border-line-2 bg-sunken">
            <div className="space-y-1.5 p-2.5">
              {[80, 55, 70, 40, 62].map((w, i) => (
                <div key={i} className="h-1.5 rounded bg-line-2" style={{ width: `${w}%` }} />
              ))}
            </div>
            {deciding && <div className="scanline" />}
          </div>
          <div className={`absolute inset-0 ${deciding ? "orbit" : ""}`}>
            {nodes.map((v, i) => {
              const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(a) * 44;
              const y = 50 + Math.sin(a) * 44;
              const cls =
                v === "agree" ? "bg-good node-agree" : v === "disagree" ? "bg-bad" : v === "working" ? "bg-violet pulse" : "bg-line-2";
              return (
                <span
                  key={i}
                  className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${cls}`}
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.15}s` }}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs font-semibold">
            {STAGES.map((s, i) => {
              const isDone = current > i || done;
              const isActive = current === i && !done;
              return (
                <li key={s.key} className="flex items-center gap-1">
                  <span className={`rounded-full px-2.5 py-1 ${isDone ? "tone-good" : isActive ? "bg-brand text-brand-ink" : "text-ink-3 border border-line"}`}>
                    {isDone ? "✓ " : ""}{s.label}
                  </span>
                  {i < STAGES.length - 1 && <span className="text-line-2">—</span>}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm text-ink-2">
            {tx.stage === "estimating" && "Preparing the transaction…"}
            {tx.stage === "signing" && "Confirm in your wallet."}
            {deciding && <span className="caret">Each validator is fetching the posting from its source and comparing what it sees</span>}
            {done && (active.length
              ? <><strong className="text-good">{agree} of {active.length}</strong> active validators independently agreed.</>
              : "Accepted by consensus.")}
          </p>
          {tx.hash && <p className="mt-2 text-xs text-ink-3">tx <TxLink hash={tx.hash} /></p>}
          {tx.stage === "failed" && <p className="mt-2 text-sm font-medium text-bad">{prettyError(tx.error)}</p>}
          {tx.stage === "failed" && tx.retry && /CONSENSUS_|SOURCE_UNAVAILABLE/.test(tx.error ?? "") && (
            <button className="btn btn-primary mt-3 !py-2 text-sm" onClick={() => tx.retry?.()}>Try again →</button>
          )}
        </div>
      </div>
    </div>
  );
}

const ERRORS: Record<string, string> = {
  CONSENSUS_LEADER_TIMEOUT: "The testnet's lead validator timed out before finishing, so nothing was recorded. This happens occasionally on Bradbury; trying again usually works.",
  CONSENSUS_VALIDATORS_TIMEOUT: "Validators timed out before agreeing, so nothing was recorded. Try again.",
  CONSENSUS_UNDETERMINED: "Validators couldn't reach agreement, so nothing was recorded. Try again in a moment.",
  RECENTLY_AUDITED: "This posting was audited moments ago. Try again after the cooldown.",
  RECENTLY_CHECKED: "This pledge was checked moments ago. Try again after the cooldown.",
  UNSUPPORTED_SOURCE: "That source is not supported yet.",
  INVALID_IDENTIFIER: "The board or job ID looks malformed.",
  INVALID_URL: "Use a full https:// URL.",
  BOND_TOO_SMALL: "The minimum bond is 0.01 GEN.",
  INVALID_WINDOW: "The window must be between 7 and 180 days.",
  POSTING_ALREADY_PLEDGED: "This posting already has an active pledge.",
  EMPLOYER_CANNOT_APPLY: "The employer cannot register as an applicant.",
  ALREADY_REGISTERED: "You are already registered on this pledge.",
  INVALID_RECEIPT_HASH: "Receipt hash must be 64 hex characters.",
  ONLY_EMPLOYER: "Only the employer who created the pledge can do this.",
  TOO_EARLY: "Reclaim opens 30 days after both the deadline and the last successful check.",
};

export function prettyError(err?: string): string {
  if (!err) return "The transaction failed.";
  for (const [code, msg] of Object.entries(ERRORS)) if (err.includes(code)) return msg;
  const src = err.match(/SOURCE_UNAVAILABLE:(\d+)/);
  if (src) return `The job source answered HTTP ${src[1]}. Nothing was recorded; try again later.`;
  return err.length > 220 ? err.slice(0, 220) + "…" : err;
}

export function PostingCard({ p, children, featured = false }: { p: Posting; children?: React.ReactNode; featured?: boolean }) {
  const [open, setOpen] = useState(false);
  const f = p.facts;
  const url = publicPostingUrl(p.key);
  const pay = f?.pay?.length ? f.pay : f?.text_pay ? [f.text_pay] : [];
  const tone = VERDICT_INFO[p.verdict]?.tone ?? "neutral";
  const accent = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : "var(--line-2)";

  return (
    <article className={`card relative overflow-hidden p-5 sm:p-6 ${featured ? "card-glow" : ""}`}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{p.ats === "jsonld" ? p.board : `${p.ats} / ${p.board}`}</p>
          <h3 className="mt-1.5 text-lg font-bold leading-snug sm:text-xl">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="hover:text-brand">{p.title || p.job_id} <span className="text-ink-3">↗</span></a>
            ) : (p.title || p.job_id)}
          </h3>
        </div>
        <VerdictBadge verdict={p.verdict} size={featured ? "lg" : "sm"} />
      </div>

      {f && f.live && (
        <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["Published pay", pay.length ? pay.map((r, i) => <div key={i} className="font-bold text-ink">{formatPay(r)}</div>) : <span className="font-bold text-bad">None</span>],
            ["Location", f.locations.join(" · ") || "Not stated"],
            ["Pay rules", <span key="j" className="mono">{f.jurisdictions.join(", ") || "—"}</span>],
            ["First posted", formatDate(f.posted_ts)],
          ].map(([k, v]) => (
            <div key={k as string} className="bg-surface p-3">
              <dt className="eyebrow !text-[0.62rem]">{k}</dt>
              <dd className="mt-1 text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Flags flags={p.flags} />
        <p className="mono text-xs text-ink-3">
          {p.audit_count}× audited · {timeAgo(p.last_audit_ts)}
          {p.pledge_id > 0 && <> · <span className="text-good">pledge #{p.pledge_id}</span></>}
        </p>
      </div>

      {children}

      {f && (
        <div className="mt-3">
          <button className="mono text-xs text-ink-3 hover:text-brand" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "▾" : "▸"} raw facts validators agreed on
          </button>
          {open && (
            <pre className="mono mt-2 max-h-72 overflow-auto rounded-xl border border-line bg-sunken p-3 text-xs leading-relaxed text-ink-2">
              {JSON.stringify(f, null, 2)}
            </pre>
          )}
        </div>
      )}
    </article>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card border-dashed p-10 text-center text-sm text-ink-2">{children}</div>;
}

export function Loading() {
  return (
    <div className="card p-10 text-center text-sm text-ink-3">
      <span className="caret mono">reading from GenLayer</span>
    </div>
  );
}

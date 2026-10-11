"use client";

import { useState } from "react";
import type { Pledge } from "@/lib/contracts/RealRole";
import { useWallet } from "@/lib/genlayer/wallet";
import { useIsApplicant, usePayouts, usePledges, useStats, useTx } from "@/lib/hooks/useRealRole";
import {
  formatDate, formatGen, keyToArgs, parseGen, parsePostingUrl, publicPostingUrl, sha256Hex, shortAddr,
} from "@/lib/realrole/format";
import { Empty, Loading, PledgeBadge, TxLink, TxProgress } from "./shared";

export function Pledges() {
  const pledges = usePledges();
  return (
    <div className="grid gap-10">
      <CreatePledge />
      <section aria-labelledby="pledges-h">
        <h2 id="pledges-h" className="text-2xl font-black tracking-tight">Pledges</h2>
        <p className="mt-1 text-sm text-ink-2">
          Bonded promises that a posting keeps an honest range and does not linger. Anyone can trigger a check;
          the contract settles from what validators observe.
        </p>
        <div className="mt-4 grid gap-4">
          {pledges.isLoading ? <Loading /> : pledges.data?.length ? (
            pledges.data.map((p) => <PledgeCard key={p.id} p={p} />)
          ) : (
            <Empty>No pledges yet. Be the first employer to put a bond behind a posting.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}

function CreatePledge() {
  const tx = useTx();
  const [url, setUrl] = useState("");
  const [days, setDays] = useState("30");
  const [bond, setBond] = useState("0.05");
  const [err, setErr] = useState("");
  const parsed = parsePostingUrl(url);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!parsed) return setErr("Paste a supported job link.");
    let value: bigint;
    try {
      value = parseGen(bond);
    } catch (x: any) {
      return setErr(x.message);
    }
    await tx.run("create_pledge", [parsed.ats, parsed.board, parsed.jobId, Number(days)], value);
  };

  return (
    <section aria-labelledby="create-h" className="card card-glow p-5 sm:p-8">
      <h2 id="create-h" className="text-2xl font-black tracking-tight">Employers: pledge a real role</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
        <li>Bond GEN behind one of your postings and choose how long it may stay open.</li>
        <li>Paste the pledge code you receive anywhere in the posting text. That proves you control it.</li>
        <li>Activate. Validators confirm the code and an honest pay range, then the clock starts.</li>
        <li>Close the posting in time (or within 14 days of marking it filled) and your bond comes back.</li>
      </ol>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">
        <div>
          <label htmlFor="pl-url" className="text-xs text-ink-3">Your job posting URL</label>
          <input id="pl-url" className="field mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://jobs.ashbyhq.com/you/…" />
        </div>
        <div>
          <label htmlFor="pl-days" className="text-xs text-ink-3">Open for (days)</label>
          <input id="pl-days" className="field mt-1" type="number" min={7} max={180} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pl-bond" className="text-xs text-ink-3">Bond (GEN)</label>
          <input id="pl-bond" className="field mt-1" inputMode="decimal" value={bond} onChange={(e) => setBond(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full" disabled={!parsed || tx.busy}>Create pledge</button>
        </div>
      </form>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <TxProgress tx={tx} />
      {tx.stage === "accepted" && typeof tx.outcome?.returned === "number" && (
        <p className="mt-3 text-sm">
          Pledge <strong>#{tx.outcome.returned}</strong> created. Copy its code from the list below into your posting, then activate it.
        </p>
      )}
    </section>
  );
}

function PledgeCard({ p }: { p: Pledge }) {
  const { address } = useWallet();
  const stats = useStats();
  const tx = useTx();
  const [showPayouts, setShowPayouts] = useState(p.status === "KEPT" || p.status === "BROKEN");
  const payouts = usePayouts(p.id, showPayouts);
  const isApplicant = useIsApplicant(p.id, address);
  const [receipt, setReceipt] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const isEmployer = !!address && address.toLowerCase() === p.employer.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const cooldown = stats.data?.cooldown_s ?? 0;
  const checkReadyAt = p.last_check_ts + cooldown;
  const live = p.status === "ACTIVE" || p.status === "FILLED_PENDING_CLOSE";
  const url = publicPostingUrl(p.posting_key);
  const [ats, board, jobId] = keyToArgs(p.posting_key);

  const onReceiptFile = async (file: File | undefined) => {
    if (!file) return;
    setReceipt(await sha256Hex(await file.arrayBuffer()));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(p.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-3">Pledge #{p.id} · {ats === "jsonld" ? new URL(jobId).hostname : `${ats} · ${board}`}</p>
          <h3 className="mt-1 break-all font-semibold">
            {url ? <a className="hover:underline" href={url} target="_blank" rel="noreferrer">{ats === "jsonld" ? jobId : `Job ${jobId}`}</a> : p.posting_key}
          </h3>
        </div>
        <PledgeBadge status={p.status} />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div><dt className="text-ink-3">Bond</dt><dd className="font-medium">{formatGen(p.bond)}</dd></div>
        <div><dt className="text-ink-3">Employer</dt><dd className="mono">{shortAddr(p.employer)}{isEmployer && " (you)"}</dd></div>
        <div><dt className="text-ink-3">{p.status === "PENDING_PROOF" ? "Window" : "Must close by"}</dt>
          <dd>{p.status === "PENDING_PROOF" ? `${p.window_days} days after activation` : p.status === "FILLED_PENDING_CLOSE" ? formatDate(p.filled_ts + 14 * 86400) : formatDate(p.deadline_ts)}</dd></div>
        <div><dt className="text-ink-3">Applicants registered</dt><dd>{p.applicant_count}</dd></div>
      </dl>

      {p.status === "PENDING_PROOF" && (
        <div className="mt-4 rounded-lg bg-sunken p-3 text-sm">
          <p className="text-ink-2">Pledge code. Put it anywhere in the posting&apos;s text, then activate:</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="mono rounded bg-surface px-2 py-1">{p.code}</code>
            <button className="btn btn-ghost px-3 py-1 text-xs" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}

      {p.outcome && (
        <p className="mt-4 text-sm">
          Outcome: <span className={`mono ${p.status === "BROKEN" ? "text-bad" : p.status === "KEPT" ? "text-good" : ""}`}>{p.outcome}</span>
          {p.enforcer && <> · enforced by <span className="mono">{shortAddr(p.enforcer)}</span></>}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {p.status === "PENDING_PROOF" && (
          <>
            <button className="btn btn-primary" disabled={tx.busy} onClick={() => tx.run("activate_pledge", [p.id])}>Activate</button>
            {isEmployer && <button className="btn btn-ghost" disabled={tx.busy} onClick={() => tx.run("withdraw_pending", [p.id])}>Withdraw bond</button>}
          </>
        )}
        {live && (
          <button
            className="btn btn-primary"
            disabled={tx.busy || now < checkReadyAt}
            title={now < checkReadyAt ? `Next check available ${formatDate(checkReadyAt)}` : "Validators re-fetch the posting and settle if the pledge is kept or broken"}
            onClick={() => tx.run("check_pledge", [p.id])}
          >
            {now < checkReadyAt ? `Check in ${Math.ceil((checkReadyAt - now) / 60)} min` : "Check this pledge"}
          </button>
        )}
        {p.status === "ACTIVE" && isEmployer && (
          <button className="btn btn-ghost" disabled={tx.busy} onClick={() => tx.run("mark_filled", [p.id])}>Mark role filled</button>
        )}
        {live && isEmployer && now > p.deadline_ts + 30 * 86400 && (
          <button className="btn btn-ghost" disabled={tx.busy} onClick={() => tx.run("reclaim_unverifiable", [p.id])}>Reclaim (unverifiable)</button>
        )}
        {(p.status === "KEPT" || p.status === "BROKEN" || p.status === "WITHDRAWN" || p.status === "UNVERIFIABLE") && (
          <button className="btn btn-ghost" onClick={() => setShowPayouts((s) => !s)}>{showPayouts ? "Hide" : "Show"} payouts</button>
        )}
      </div>

      {p.status === "ACTIVE" && !isEmployer && (
        <div className="mt-4 rounded-lg border border-line p-3 text-sm">
          {isApplicant.data ? (
            <p className="text-good">You are registered. If this pledge breaks, you share 90% of the bond.</p>
          ) : (
            <>
              <p className="text-ink-2">
                Applied to this role? Register to share the bond if the pledge breaks. Choose your application
                confirmation (email export, PDF or screenshot). It is hashed in your browser and only the hash goes on-chain.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="btn btn-ghost cursor-pointer text-xs">
                  Choose receipt file
                  <input type="file" className="sr-only" onChange={(e) => onReceiptFile(e.target.files?.[0])} />
                </label>
                {receipt && <code className="mono text-xs text-ink-3">sha256 {receipt.slice(0, 16)}…</code>}
                <button className="btn btn-primary text-xs" disabled={!receipt || tx.busy} onClick={() => tx.run("register_applicant", [p.id, receipt])}>
                  Register as applicant
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showPayouts && (
        <div className="mt-4 text-sm">
          {payouts.isLoading ? <p className="text-ink-3">Loading payouts…</p> : payouts.data?.length ? (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {payouts.data.map((x, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span className="mono">{shortAddr(x.to)}</span>
                  <span className="text-ink-3">{x.reason.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="font-medium">{formatGen(x.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-ink-3">No payouts recorded.</p>}
        </div>
      )}

      <TxProgress tx={tx} />
      {tx.stage === "accepted" && typeof tx.outcome?.returned === "string" && (
        <p className="mt-2 text-sm">Result: <span className="mono">{tx.outcome.returned}</span></p>
      )}
      {tx.hash && tx.stage === "accepted" && <p className="sr-only">Transaction <TxLink hash={tx.hash} /></p>}
    </article>
  );
}

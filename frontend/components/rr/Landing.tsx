"use client";

import { useEffect, useMemo, useState } from "react";
import type { Posting } from "@/lib/contracts/RealRole";
import { usePledges, usePostings } from "@/lib/hooks/useRealRole";
import { WEB3_BOARDS, companyFor } from "@/lib/realrole/companies";
import { formatPay, publicPostingUrl } from "@/lib/realrole/format";
import { VerdictBadge } from "./shared";
import { GhostPosting, PledgeVault, TrustPipeline, ValidatorHalo } from "./Illustrations";

/* ------------------------------------------------------------ helpers -- */

function ageDays(p: Posting): number | null {
  const ts = p.facts?.posted_ts;
  return ts ? Math.floor((Date.now() / 1000 - ts) / 86400) : null;
}

function ageText(days: number): string {
  if (days >= 730) return `${(days / 365).toFixed(1)} years`;
  if (days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

/** The one fact about a posting that makes someone stop scrolling. */
export function headlineFact(p: Posting): { big: string; small: string; tone: string } {
  const f = p.facts;
  const days = ageDays(p);
  const pay = f?.pay?.[0] ?? f?.text_pay ?? null;
  if (p.verdict === "CLOSED") return { big: "Closed", small: "No longer live at the source", tone: "text-ink-2" };
  if (p.verdict === "MISSING_RANGE")
    return { big: "No pay range", small: `${f?.jurisdictions.filter((j) => j !== "OTHER").join(", ")} rule applies${days && days > 90 ? ` · open ${ageText(days)}` : ""}`, tone: "text-bad" };
  if (p.verdict === "TOO_WIDE" && pay)
    return { big: `${(pay.max / pay.min).toFixed(1)}× range`, small: formatPay(pay), tone: "text-warn" };
  if (days && days > 365) return { big: `Open ${ageText(days)}`, small: pay ? formatPay(pay) : "Still listed as open", tone: "text-warn" };
  if (pay) return { big: formatPay(pay).replace(" / yr", ""), small: days && days > 90 ? `open ${ageText(days)}` : "published range", tone: "text-good" };
  return { big: "No range", small: "No listed pay rule applies", tone: "text-ink-2" };
}

function companyName(p: Posting): string {
  return companyFor(p.board)?.name ?? p.board;
}

/** Postings worth showing first: the ones that make the point. */
function interest(p: Posting): number {
  const d = ageDays(p) ?? 0;
  return (p.verdict === "MISSING_RANGE" ? 3 : p.verdict === "TOO_WIDE" ? 2.5 : 0) + Math.min(d / 365, 4) + (p.flags.includes("PAY_FROM_DESCRIPTION") ? 0.5 : 0);
}

/* --------------------------------------------------------- hero demo -- */

export function HeroDemo() {
  const postings = usePostings();
  const pool = useMemo(
    () => (postings.data ?? []).filter((p) => p.verdict && p.facts?.live).sort((a, b) => interest(b) - interest(a)).slice(0, 8),
    [postings.data],
  );
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"scan" | "stamp">("scan");

  useEffect(() => {
    if (!pool.length) return;
    setPhase("scan");
    const a = setTimeout(() => setPhase("stamp"), 1600);
    const b = setTimeout(() => setI((x) => (x + 1) % pool.length), 4600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [i, pool.length]);

  const p = pool[i % Math.max(pool.length, 1)];
  if (!p) {
    return <div className="card card-glow h-[340px] animate-pulse" aria-hidden="true" />;
  }
  const fact = headlineFact(p);
  return (
    <div className="relative">
    <ValidatorHalo />
    <div className="card card-glow relative overflow-hidden p-6" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Replay of a stored verdict · {p.ats}</p>
        <span className="mono flex items-center gap-1.5 text-[0.65rem] text-ink-3">
          <span className="h-1.5 w-1.5 rounded-full bg-good" /> real posting
        </span>
      </div>
      <p className="mt-4 text-sm font-bold uppercase tracking-wide text-ink-3">{companyName(p)}</p>
      <h3 className="mt-1 min-h-[3.5rem] text-xl font-black leading-tight">{p.title}</h3>

      <div className="relative mt-5 h-28 overflow-hidden rounded-xl border border-line-2 bg-sunken p-4">
        <p className={`text-3xl font-black ${fact.tone}`}>{fact.big}</p>
        <p className="mt-1 text-sm text-ink-2">{fact.small}</p>
        {phase === "scan" && <div className="scanline" />}
      </div>

      <div className="mt-5 flex min-h-[3.25rem] items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-3 w-3 rounded-full ${phase === "stamp" ? "bg-good node-agree" : "bg-violet pulse"}`}
              style={{ animationDelay: `${n * 0.12}s` }}
            />
          ))}
          <span className="mono ml-2 text-xs text-ink-3">{phase === "stamp" ? "how validators ruled" : "replaying the audit…"}</span>
        </div>
        {phase === "stamp" && <span key={`${p.key}-s`}><VerdictBadge verdict={p.verdict} size="lg" /></span>}
      </div>
      <div className="mt-4 flex gap-1" aria-hidden="true">
        {pool.map((_, n) => <span key={n} className={`h-0.5 flex-1 rounded ${n === i % pool.length ? "bg-brand" : "bg-line-2"}`} />)}
      </div>
    </div>
    </div>
  );
}

/* ------------------------------------------------------------ problem -- */

const STATS = [
  { n: "18–22%", label: "of jobs posted on Greenhouse each quarter are classified as ghost jobs", src: "Greenhouse, 2024", url: "https://www.greenhouse.com/blog/greenhouse-2024-state-of-job-hunting-report" },
  { n: "40%", label: "of hiring managers say their company posted a fake job listing in 2024", src: "ResumeBuilder survey, 2024", url: "https://www.resumebuilder.com/3-in-10-companies-currently-have-fake-job-posting-listed/" },
  { n: "41%", label: "of US job postings still don’t show pay, despite laws in 13+ states", src: "Indeed Hiring Lab, 2025 (59% show it)", url: "https://www.indeed.com/news/releases/pay-transparency-across-high-earning-sectors" },
  { n: "1.9M", label: "more openings than hires in a single month: 7.1M posted vs 5.2M filled", src: "US BLS JOLTS, Aug 2026 (prelim.)", url: "https://www.bls.gov/news.release/archives/jolts_09292026.htm" },
];

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-24 py-16">
      <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
      <div>
      <p className="eyebrow">The problem</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        The job market runs on claims <span className="text-bad">nobody verifies.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-ink-2 sm:text-lg">
        Candidates spend weekends applying to roles that were never going to be filled. Laws now require pay ranges, from New
        York to the EU directive (deadline 7 June 2026), but enforcement is complaint-driven and slow. Lawmakers have noticed:
        New York&apos;s ghost-job bill passed both chambers in June 2026.
      </p>
      </div>
      <GhostPosting className="mx-auto h-auto w-full max-w-[300px]" />
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <a key={s.n} href={s.url} target="_blank" rel="noreferrer" className="card group p-5 transition hover:border-line-2">
            <p className="text-5xl font-black tracking-tight text-ink">{s.n}</p>
            <p className="mt-3 text-sm text-ink-2">{s.label}</p>
            <p className="mono mt-4 text-[0.65rem] text-ink-3 group-hover:text-brand">{s.src} ↗</p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ live wall -- */

export function LiveWall() {
  const postings = usePostings();
  const all = (postings.data ?? []).filter((p) => p.verdict && p.ats !== "jsonld");
  const web2 = all.filter((p) => !WEB3_BOARDS.has(p.board)).sort((a, b) => interest(b) - interest(a)).slice(0, 6);
  const web3 = all.filter((p) => WEB3_BOARDS.has(p.board)).sort((a, b) => interest(b) - interest(a)).slice(0, 6);
  const Column = ({ title, items }: { title: string; items: Posting[] }) => (
    <div>
      <p className="mono mb-3 text-xs uppercase tracking-widest text-ink-3">{title}</p>
      <div className="grid gap-3">
        {items.map((p) => {
          const f = headlineFact(p);
          const url = publicPostingUrl(p.key);
          return (
            <a key={p.key} href={url ?? "#"} target="_blank" rel="noreferrer" className="card group grid grid-cols-[1fr_auto] items-center gap-4 p-4 transition hover:border-line-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-3">{companyName(p)}</p>
                <p className="truncate font-bold group-hover:text-brand">{p.title}</p>
                <p className={`mono mt-1 text-sm font-bold ${f.tone}`}>{f.big} <span className="font-normal text-ink-3">· {f.small}</span></p>
              </div>
              <VerdictBadge verdict={p.verdict} />
            </a>
          );
        })}
        {!items.length && <div className="card p-6 text-sm text-ink-3">{postings.isLoading ? "Reading from GenLayer…" : "Nothing audited yet."}</div>}
      </div>
    </div>
  );
  return (
    <section id="live" className="scroll-mt-24 py-16">
      <p className="eyebrow">Live on GenLayer Bradbury</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        Real jobs. Real companies. <span className="text-gradient">Verdicts nobody can edit.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-ink-2 sm:text-lg">
        Each one was read from the company&apos;s own job board by independent validators and settled on chain. Click any card to
        open the live posting and check it yourself.
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Column title="Web2 · big tech & fintech" items={web2} />
        <Column title="Web3 · exchanges & protocols" items={web3} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- why genlayer -- */

// Columns: RealRole first so it stays visible when the table scrolls on phones.
const COLS = ["RealRole on GenLayer", "Job boards", "Scraper + AI tool", "Normal smart contract"];
const ROWS: [string, string, string, string, string][] = [
  ["Reads the live posting at its source", "✓", "✓", "✓", "✗"],
  ["Understands messy text (locations, prose pay)", "✓", "✗", "✓", "✗"],
  ["No single company decides the verdict", "✓", "✗", "✗", "~"],
  ["Verdict can’t be quietly edited later", "✓", "✗", "✗", "✓"],
  ["Can hold and pay out money on the outcome", "✓", "✗", "✗", "✓"],
];

export function WhyGenLayer() {
  return (
    <section id="why" className="scroll-mt-24 py-16">
      <p className="eyebrow">Why this only works on GenLayer</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        A referee that reads the web, <span className="text-gradient">and that no one owns.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-ink-2 sm:text-lg">
        Checking a job posting means reading a live web page and interpreting it. Normal blockchains can&apos;t do either. AI
        tools can, but then you&apos;re trusting whoever runs the AI. GenLayer has independent validators each fetch the
        posting, run their own model, and only accept a verdict they agree on.
      </p>

      <div className="card mt-10 overflow-x-auto p-4 sm:p-8">
        <div className="min-w-[640px]"><TrustPipeline /></div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-4 font-medium text-ink-3"></th>
              {COLS.map((h, i) => (
                <th key={h} className={`p-4 text-center font-bold ${i === 0 ? "bg-brand/10 text-brand" : "text-ink-2"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, ...cells]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <td className="p-4 font-medium">{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className={`p-4 text-center text-lg font-black ${i === 0 ? "bg-brand/10" : ""} ${c === "✓" ? (i === 0 ? "text-brand" : "text-good/70") : c === "✗" ? "text-bad/70" : "text-warn"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["01", "Fetch", "Every validator independently reads the posting from the employer’s own hiring system: Greenhouse, Lever, Ashby, or schema.org data on a careers page."],
          ["02", "Observe", "Code extracts the structured pay. An AI only maps messy locations to a fixed list of pay-law jurisdictions. Validators must agree on the facts."],
          ["03", "Decide", "The contract computes the verdict and any payout from the agreed facts. The AI never picks a winner, a recipient or an amount."],
        ].map(([n, t, d]) => (
          <div key={n} className="card relative overflow-hidden p-6">
            <span className="mono absolute right-4 top-3 text-5xl font-black text-white/[0.05]" aria-hidden="true">{n}</span>
            <p className="text-lg font-black text-brand">{t}</p>
            <p className="mt-2 text-sm text-ink-2">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-3">
        Nothing like this exists today: pay-transparency checks are either self-reported by employers or run by a single
        company you have to trust. And no tool lets an employer put money behind a promise that their posting is real.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------- pledge -- */

export function PledgeStory() {
  const pledges = usePledges();
  const count = pledges.data?.length ?? 0;
  const live = (pledges.data ?? []).filter((p) => p.status === "ACTIVE" || p.status === "FILLED_PENDING_CLOSE").length;
  return (
    <section id="pledge" className="scroll-mt-24 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">For employers who mean it</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Put money behind <span className="text-gradient">“this role is real.”</span>
          </h2>
          <p className="mt-4 text-ink-2 sm:text-lg">
            The Real Role Pledge is a GEN bond on one posting. Keep an honest range and close the role on time, and you get it
            back with a public &ldquo;pledge kept&rdquo; record. Let it linger as a ghost job, and the bond pays the candidates
            who applied.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#app" onClick={() => (location.hash = "pledges")} className="btn btn-primary">See live pledges →</a>
            <a href="/demo/careers" className="btn btn-ghost">Open the demo employer</a>
          </div>
          <p className="mono mt-4 text-xs text-ink-3">{count} pledges on chain · {live} active right now</p>
        </div>
        <div>
        <div className="mx-auto max-w-[400px]"><PledgeVault /></div>
        <ol className="mt-6 grid gap-3">
          {[
            ["Bond", "Employer locks GEN behind one posting and picks a window (7–180 days)."],
            ["Prove", "They paste a contract-issued code into the posting. Validators must see it, so only the real employer can activate it."],
            ["Watch", "Anyone can trigger a check. Validators re-read the posting from its source."],
            ["Settle", "Closed on time → bond returned. Lingering or range removed → 90% to applicants, 10% to whoever caught it."],
          ].map(([t, d], n) => (
            <li key={t} className="card flex gap-4 p-4">
              <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand font-black text-brand-ink">{n + 1}</span>
              <div>
                <p className="font-bold">{t}</p>
                <p className="text-sm text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ audience -- */

export function Audience() {
  const items = [
    ["Job seekers", "Check a role before you spend a weekend on it. See whether pay is published and how long it has really been open."],
    ["Honest employers", "Prove your roles are real with a bonded pledge. A public track record beats a careers page full of promises."],
    ["Journalists & regulators", "A public, tamper-proof dataset of who publishes pay and who leaves roles up for years, with the source link for every claim."],
    ["Job boards & tools", "Show a RealRole stamp next to listings. Every verdict is a free, public contract read."],
  ];
  return (
    <section className="py-16">
      <p className="eyebrow">Who it&apos;s for</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([t, d]) => (
          <div key={t} className="card p-6">
            <p className="text-lg font-black">{t}</p>
            <p className="mt-2 text-sm text-ink-2">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- start here -- */

export function StartHere({ onPick }: { onPick: (tab: "audit" | "explore" | "pledges") => void }) {
  const cards: { tab: "audit" | "explore" | "pledges"; n: string; t: string; d: string; cta: string }[] = [
    { tab: "explore", n: "1", t: "Browse live jobs", d: "Pick Stripe, OpenAI, Coinbase or any of 21 companies. Sort by oldest and spot the ghosts.", cta: "Open the explorer" },
    { tab: "audit", n: "2", t: "Check any job link", d: "Paste a Greenhouse, Lever, Ashby or careers-page link. Get an on-chain verdict in about a minute.", cta: "Check a job" },
    { tab: "pledges", n: "3", t: "Pledge a role", d: "Employers: bond GEN behind a posting and earn a public “pledge kept” record.", cta: "See pledges" },
  ];
  return (
    <section id="start" className="scroll-mt-24 py-16">
      <p className="eyebrow">Start here</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Three ways in. No wallet needed to look.</h2>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <button key={c.tab} onClick={() => onPick(c.tab)} className="card card-glow group p-6 text-left transition hover:-translate-y-0.5">
            <span className="mono text-xs text-brand">0{c.n}</span>
            <p className="mt-2 text-xl font-black">{c.t}</p>
            <p className="mt-2 text-sm text-ink-2">{c.d}</p>
            <p className="mt-5 text-sm font-bold text-brand group-hover:underline">{c.cta} →</p>
          </button>
        ))}
      </div>
    </section>
  );
}

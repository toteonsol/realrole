"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/genlayer/wallet";
import { CHAIN, getContractAddress, EXPLORER_URL } from "@/lib/genlayer/client";
import { usePostings, useStats } from "@/lib/hooks/useRealRole";
import { VERDICT_INFO, formatPay, shortAddr } from "@/lib/realrole/format";

export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5" aria-label="RealRole home">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect x="1" y="1" width="28" height="28" rx="8" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d="M8.5 15.5l4.2 4.2 8.8-9.5" stroke="var(--brand)" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg font-black tracking-tight">Real<span className="text-brand">Role</span></span>
    </a>
  );
}

export function Header() {
  const { address, isConnected, isLoading, isMetaMaskInstalled, isOnCorrectNetwork, connectWallet, disconnectWallet } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="mono hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-good pulse" />
            {CHAIN.name} · {CHAIN.id}
          </span>
          {isLoading ? null : !isMetaMaskInstalled ? (
            <a className="btn btn-ghost" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Install MetaMask</a>
          ) : isConnected && address ? (
            <>
              {!isOnCorrectNetwork && <button className="btn btn-ghost text-warn" onClick={() => connectWallet()}>Switch network</button>}
              <button className="btn btn-ghost mono" onClick={disconnectWallet} title="Disconnect">{shortAddr(address)}</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => connectWallet()}>Connect wallet</button>
          )}
        </div>
      </div>
    </header>
  );
}

/** Scrolling tape of the latest on-chain verdicts. */
export function Ticker() {
  const postings = usePostings();
  const items = (postings.data ?? []).filter((p) => p.verdict);
  if (items.length < 2) return null;
  const row = items.map((p) => {
    const info = VERDICT_INFO[p.verdict];
    const pay = p.facts?.pay?.[0] ?? p.facts?.text_pay ?? null;
    return (
      <span key={p.key} className="mx-6 inline-flex items-center gap-2.5 whitespace-nowrap text-xs">
        <span className={`h-1.5 w-1.5 rounded-full ${info?.tone === "good" ? "bg-good" : info?.tone === "bad" ? "bg-bad" : info?.tone === "warn" ? "bg-warn" : "bg-neutral"}`} />
        <span className="mono uppercase text-ink-3">{p.board}</span>
        <span className="text-ink">{p.title}</span>
        <span className={`mono font-bold ${info?.tone === "good" ? "text-good" : info?.tone === "bad" ? "text-bad" : "text-ink-2"}`}>
          {info?.label}{pay ? ` · ${formatPay(pay)}` : ""}
        </span>
      </span>
    );
  });
  return (
    <div className="marquee overflow-hidden border-b border-line bg-sunken/60 py-2.5" aria-label="Latest verdicts">
      <div className="marquee-track">
        <div className="flex">{row}</div>
        <div className="flex" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}

function CountUp({ value }: { value?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value === undefined) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{value === undefined ? "—" : shown}</>;
}

const ROTATING = ["hide the pay.", "never get filled.", "linger for months.", "waste your weekend."];

export function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % ROTATING.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="relative pt-14 pb-10 sm:pt-20">
      <p className="eyebrow rise">Pay transparency × ghost-job accountability · on GenLayer</p>
      <h1 className="rise mt-4 max-w-4xl text-[2.6rem] font-black leading-[1.02] tracking-tight sm:text-7xl" style={{ animationDelay: "80ms" }}>
        Some job posts
        <br />
        <span key={i} className="text-gradient inline-block rise">{ROTATING[i]}</span>
      </h1>
      <p className="rise mt-6 max-w-2xl text-ink-2 sm:text-lg" style={{ animationDelay: "160ms" }}>
        RealRole puts every posting on the record. Independent GenLayer validators read it straight from the employer&apos;s
        hiring system, agree on the facts, and stamp a verdict nobody can quietly edit. Employers who mean it can bond GEN
        behind a <span className="font-bold text-ink">Real Role Pledge</span>.
      </p>
    </section>
  );
}

export function StatsStrip() {
  const stats = useStats();
  const postings = usePostings();
  const contract = getContractAddress();
  const missing = (postings.data ?? []).filter((p) => p.verdict === "MISSING_RANGE").length;
  const stale = (postings.data ?? []).filter((p) => p.flags.includes("STALE")).length;
  const items: [string, number | undefined, string][] = [
    ["postings on record", stats.data?.postings, "text-ink"],
    ["validator audits", stats.data?.audits, "text-ink"],
    ["missing pay where a rule applies", postings.data ? missing : undefined, "text-bad"],
    ["open 90+ days", postings.data ? stale : undefined, "text-warn"],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(([label, v, color], idx) => (
          <div key={label} className="card rise px-5 py-4" style={{ animationDelay: `${200 + idx * 70}ms` }}>
            <p className={`text-4xl font-black tabular-nums ${color}`}><CountUp value={v} /></p>
            <p className="mt-1 text-xs text-ink-3">{label}</p>
          </div>
        ))}
      </div>
      {contract && (
        <p className="mono mt-3 text-[0.7rem] text-ink-3">
          contract{" "}
          <a className="underline decoration-line-2 underline-offset-2 hover:text-brand" href={`${EXPLORER_URL}/address/${contract}`} target="_blank" rel="noreferrer">{contract}</a>
          {" "}· reading needs no wallet
        </p>
      )}
    </div>
  );
}

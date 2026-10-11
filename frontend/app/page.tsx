"use client";

import { useEffect, useState } from "react";
import { Header, Hero, StatsStrip, Ticker } from "@/components/rr/Header";
import { Audience, HeroDemo, LiveWall, PledgeStory, Problem, StartHere, WhyGenLayer } from "@/components/rr/Landing";
import { AuditPanel } from "@/components/rr/AuditPanel";
import { Explorer } from "@/components/rr/Explorer";
import { Registry } from "@/components/rr/Registry";
import { Pledges } from "@/components/rr/Pledges";
import { HowItWorks } from "@/components/rr/HowItWorks";
import { getContractAddress } from "@/lib/genlayer/client";

const TABS = [
  { id: "audit", label: "Check a job", icon: "⌕" },
  { id: "explore", label: "Browse live jobs", icon: "◎" },
  { id: "registry", label: "The record", icon: "▤" },
  { id: "pledges", label: "Pledges", icon: "◈" },
  { id: "how", label: "Rules", icon: "§" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("audit");

  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === fromHash)) {
        setTab(fromHash);
        document.getElementById("app")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const open = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
    document.getElementById("app")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!getContractAddress()) {
    return (
      <div className="p-10 text-sm">
        Set <code className="mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code className="mono">frontend/.env.local</code>.
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip">
      <div className="backdrop" aria-hidden="true" />
      <Header />
      <Ticker />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Hero demo={<HeroDemo />} onStart={open} />
        <StatsStrip />
        <Problem />
        <LiveWall />
        <WhyGenLayer />
        <PledgeStory />
        <Audience />
        <StartHere onPick={open} />

        <section id="app" className="scroll-mt-20 pt-10">
          <p className="eyebrow">The app</p>
          <nav
            className="sticky top-[62px] z-20 mt-4 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/80 p-1 backdrop-blur-xl"
            role="tablist"
            aria-label="App sections"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => open(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
                  tab === t.id ? "bg-brand text-brand-ink shadow-[0_0_24px_rgba(198,255,61,0.25)]" : "text-ink-3 hover:bg-white/5 hover:text-ink"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <div key={tab} className="rise min-h-[60vh] pt-10" role="tabpanel">
            {tab === "audit" && <AuditPanel />}
            {tab === "explore" && <Explorer />}
            {tab === "registry" && <Registry />}
            {tab === "pledges" && <Pledges />}
            {tab === "how" && <HowItWorks />}
          </div>
        </section>
      </main>
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-ink-3 sm:px-6">
          <p className="mono">RealRole · built on GenLayer · verdicts are informational, not legal advice</p>
          <div className="flex gap-4">
            <a className="hover:text-ink" href="https://github.com/toteonsol/realrole" target="_blank" rel="noreferrer">GitHub</a>
            <a className="hover:text-ink" href="/demo/careers">Demo employer</a>
            <a className="hover:text-ink" href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

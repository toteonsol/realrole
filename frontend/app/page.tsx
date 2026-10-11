"use client";

import { useEffect, useState } from "react";
import { Header, Hero, StatsStrip, Ticker } from "@/components/rr/Header";
import { AuditPanel } from "@/components/rr/AuditPanel";
import { Registry } from "@/components/rr/Registry";
import { Pledges } from "@/components/rr/Pledges";
import { HowItWorks } from "@/components/rr/HowItWorks";
import { getContractAddress } from "@/lib/genlayer/client";

const TABS = [
  { id: "audit", label: "Audit a post", icon: "⌕" },
  { id: "registry", label: "The record", icon: "▤" },
  { id: "pledges", label: "Pledges", icon: "◈" },
  { id: "how", label: "How it works", icon: "?" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("audit");

  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const select = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
    const anchor = document.getElementById("tabs-anchor");
    if (anchor && anchor.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - 70, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="backdrop" aria-hidden="true" />
      <Header />
      <Ticker />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Hero />
        {!getContractAddress() ? (
          <div className="card p-6 text-sm">
            Set <code className="mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code className="mono">frontend/.env.local</code> to the deployed RealRole contract.
          </div>
        ) : (
          <>
            <StatsStrip />
            <div id="tabs-anchor" />
            <nav
              className="sticky top-[62px] z-20 mt-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/80 p-1 backdrop-blur-xl"
              role="tablist"
              aria-label="Sections"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => select(t.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
                    tab === t.id ? "bg-brand text-brand-ink shadow-[0_0_24px_rgba(198,255,61,0.25)]" : "text-ink-3 hover:bg-white/5 hover:text-ink"
                  }`}
                >
                  <span aria-hidden="true">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </nav>
            <div key={tab} className="rise pt-10" role="tabpanel">
              {tab === "audit" && <AuditPanel />}
              {tab === "registry" && <Registry />}
              {tab === "pledges" && <Pledges />}
              {tab === "how" && <HowItWorks />}
            </div>
          </>
        )}
      </main>
      <footer className="border-t border-line py-8 text-center">
        <p className="mono text-xs text-ink-3">RealRole · built on GenLayer · verdicts are informational, not legal advice</p>
      </footer>
    </div>
  );
}

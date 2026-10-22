export function HowItWorks() {
  return (
    <div className="grid gap-8 text-[0.95rem] leading-relaxed">
      <section className="card p-6">
        <h2 className="text-2xl font-black tracking-tight">Why this exists</h2>
        <p className="mt-2 text-ink-2">
          Job seekers spend hours on postings that were never meant to be filled, or that hide pay that the law says
          must be published. Pay-transparency rules now cover New York City, California, Colorado, Washington, Illinois,
          and more, plus the EU directive, but nobody checks postings at scale and there is no neutral public record.
          RealRole is that record: verdicts no single company, server or AI model can quietly change.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1. Fetch from the source", "Each validator independently reads the posting from the employer’s own hiring system (Greenhouse, Lever, Ashby) or schema.org JobPosting data, not a scraped copy."],
          ["2. Observe, don’t decide", "Code parses the structured pay fields. An LLM only maps messy locations to a closed list of pay-rule jurisdictions, and reads a range written in prose. Validators must agree on these facts."],
          ["3. Contract decides", "The verdict, every pledge transition and every payout is computed deterministically from the agreed facts. The AI never chooses a winner or an amount."],
        ].map(([t, d]) => (
          <div key={t} className="card relative overflow-hidden p-6">
            <span className="mono absolute -right-2 -top-6 text-8xl font-black text-white/[0.04]" aria-hidden="true">{t.slice(0, 1)}</span>
            <h3 className="text-lg font-bold text-brand">{t}</h3>
            <p className="mt-2 text-sm text-ink-2">{d}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-black tracking-tight">Verdicts</h2>
        <ul className="mt-3 grid gap-2 text-sm text-ink-2">
          <li><strong className="text-ink">Honest range</strong>: a range is published and the top is at most 2× the bottom.</li>
          <li><strong className="text-ink">Missing range</strong>: a listed pay-transparency rule applies, but no range is published.</li>
          <li><strong className="text-ink">Range too wide</strong>: published, but wider than 2× (the RealRole standard, not a legal test).</li>
          <li><strong className="text-ink">No range (no rule)</strong>: no range, and no listed rule applies. Informational only.</li>
          <li><strong className="text-ink">Closed</strong>: the source returns 404, the job is unlisted, or its validThrough date has passed.</li>
          <li><strong className="text-ink">Open 90d+</strong> is a flag, not a verdict: a common sign of a ghost job.</li>
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-black tracking-tight">The Real Role Pledge</h2>
        <ul className="mt-3 grid gap-2 text-sm text-ink-2">
          <li>The employer bonds GEN and places a contract-issued code in the posting. Validators must see the code, so only someone who controls the posting can activate it.</li>
          <li><strong className="text-ink">Kept</strong> only when a consensus check records the posting closed at or before the deadline. Closing late is not enough: the closure has to be proven on chain in time.</li>
          <li><strong className="text-ink">Mark filled</strong> can only bring the deadline forward (to 14 days after filling), never extend it.</li>
          <li><strong className="text-ink">Broken</strong> when the posting is seen live after the deadline, first seen closed after it, or loses its honest range. Staked applicants share up to 40% (max 5% each), the enforcer gets 10%, and the rest (at least 50%) is burned, so an employer farming fake applicants still loses half.</li>
          <li><strong className="text-ink">Outages</strong> settle only on evidence: three consensus-verified attestations after the deadline, spread over two days. Greenhouse, Lever or Ashby outages refund the employer; a self-hosted page going dark counts as broken.</li>
          <li>All payouts are credited first and pulled with <em>Withdraw</em>, and the contract publishes its solvency (holdings vs. owed and locked).</li>
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-black tracking-tight">Limits, stated plainly</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-ink-2">
          <li>Verdicts are informational, not legal advice. The jurisdiction list is a fixed vocabulary in the contract.</li>
          <li>RealRole can’t prove anyone was hired. The pledge measures what is publicly checkable: the posting closes on time and keeps its range.</li>
          <li>Applicants stake GEN and register a receipt hash, not a verified application. Payout caps and burning mean wallet farming can never recover more than half a bond; verified applications (e.g. zk-email) are on the roadmap.</li>
          <li>Company-hosted Greenhouse pages need the job-boards.greenhouse.io link. Workday and iCIMS aren’t supported yet.</li>
        </ul>
      </section>
    </div>
  );
}

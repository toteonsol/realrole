import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_COMPANY, DEMO_JOBS, jobPostingJsonLd } from "@/lib/demo/jobs";

export const dynamic = "force-static";

export function generateStaticParams() {
  return DEMO_JOBS.map((j) => ({ slug: j.slug }));
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://realrole-one.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = DEMO_JOBS.find((j) => j.slug === slug);
  return { title: job ? `${job.title} · ${DEMO_COMPANY} (demo)` : "Demo careers", robots: { index: false } };
}

export default async function DemoJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = DEMO_JOBS.find((j) => j.slug === slug);
  if (!job) notFound();
  const url = `${SITE}/demo/careers/${job.slug}`;
  const ld = jobPostingJsonLd(job, url);

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-[#1b1c20]">
      {!job.closed && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      )}
      <div className="bg-[#1b1c20] px-4 py-2 text-center text-xs text-[#f6f5f1]">
        Demo employer for <a className="underline" href="/">RealRole</a>. {DEMO_COMPANY} is fictional; this page exists to show
        GenLayer validators reading a real careers page.
      </div>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <a href="/demo/careers" className="text-sm text-[#5b5d66] hover:underline">← {DEMO_COMPANY} careers</a>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{job.title}</h1>
        <p className="mt-2 text-[#5b5d66]">
          {job.location.city}, {job.location.region} · Full-time · Posted {job.datePosted}
        </p>

        {job.closed ? (
          <div className="mt-8 rounded-xl border border-[#d7d4cc] bg-white p-5">
            <p className="font-semibold">This position has been filled and is closed.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-xl border border-[#d7d4cc] bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-[#5b5d66]">Base salary</p>
              <p className="mt-1 text-2xl font-bold">
                {job.salary ? `$${job.salary.min.toLocaleString()} – $${job.salary.max.toLocaleString()} per year` : "Competitive"}
              </p>
            </div>
            <section className="mt-8 space-y-4 leading-relaxed">
              <p>{job.summary}</p>
              <ul className="list-disc space-y-1 pl-5">
                {job.responsibilities.map((r) => <li key={r}>{r}</li>)}
              </ul>
              {job.pledgeCode && (
                <p className="rounded-lg bg-[#e8f5d6] px-3 py-2 font-mono text-sm">RealRole pledge: {job.pledgeCode}</p>
              )}
            </section>
          </>
        )}

        <aside className="mt-12 border-t border-[#d7d4cc] pt-6 text-sm text-[#5b5d66]">
          <p className="font-semibold text-[#1b1c20]">What this demo shows</p>
          <p className="mt-1">{job.demonstrates}</p>
          <p className="mt-3">
            Audit this page on RealRole with the URL <code className="break-all">{url}</code>
          </p>
        </aside>
      </main>
    </div>
  );
}

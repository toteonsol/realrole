import type { Metadata } from "next";
import { DEMO_COMPANY, DEMO_JOBS } from "@/lib/demo/jobs";

export const dynamic = "force-static";
export const metadata: Metadata = { title: `${DEMO_COMPANY} careers (RealRole demo)`, robots: { index: false } };

export default function DemoCareers() {
  return (
    <div className="min-h-screen bg-[#f6f5f1] text-[#1b1c20]">
      <div className="bg-[#1b1c20] px-4 py-2 text-center text-xs text-[#f6f5f1]">
        Demo employer for <a className="underline" href="/">RealRole</a>. {DEMO_COMPANY} is fictional.
      </div>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-4xl font-black tracking-tight">{DEMO_COMPANY} careers</h1>
        <p className="mt-2 text-[#5b5d66]">
          Four postings, each built to show one RealRole outcome. Validators read these pages the same way they read any
          careers page with schema.org JobPosting data.
        </p>
        <ul className="mt-8 divide-y divide-[#d7d4cc] rounded-xl border border-[#d7d4cc] bg-white">
          {DEMO_JOBS.map((j) => (
            <li key={j.slug} className="p-5">
              <a href={`/demo/careers/${j.slug}`} className="text-lg font-bold hover:underline">{j.title}</a>
              <p className="text-sm text-[#5b5d66]">
                {j.location.city}, {j.location.region}
                {j.closed ? " · Closed" : j.salary ? ` · $${j.salary.min.toLocaleString()}–$${j.salary.max.toLocaleString()}` : " · No range listed"}
                {j.pledgeCode && " · Real Role Pledge"}
              </p>
              <p className="mt-1 text-sm">{j.demonstrates}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

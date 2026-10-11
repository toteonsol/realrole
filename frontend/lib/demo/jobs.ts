/**
 * Demo employer for showing the Real Role Pledge end to end.
 * "Northwind Labs" is fictional. These pages exist so GenLayer validators can
 * read a careers page we control: a pledge code can be inserted, and a posting
 * can later be closed (pledge kept) or have its pay range removed (pledge broken).
 *
 * To change a posting's on-chain outcome, edit it here and redeploy.
 */
export interface DemoJob {
  slug: string;
  title: string;
  location: { city: string; region: string; country: string };
  salary: { min: number; max: number } | null;
  datePosted: string;
  validThrough: string;
  /** Code issued by create_pledge; validators must find it in the posting text. */
  pledgeCode: string | null;
  /** Closed postings stop publishing JobPosting data, so validators see CLOSED. */
  closed: boolean;
  summary: string;
  responsibilities: string[];
  /** What this demo posting is meant to show on RealRole. */
  demonstrates: string;
}

export const DEMO_COMPANY = "Northwind Labs";

export const DEMO_JOBS: DemoJob[] = [
  {
    slug: "protocol-engineer",
    title: "Protocol Engineer",
    location: { city: "Denver", region: "CO", country: "US" },
    salary: { min: 150000, max: 185000 },
    datePosted: "2026-10-12",
    validThrough: "2027-01-31",
    pledgeCode: "realrole-1-2d5cbf75",
    closed: false,
    summary:
      "Build and maintain the settlement layer of a payments protocol. You will own smart contract releases end to end, from design review to audit fixes.",
    responsibilities: [
      "Design and ship upgrades to the core settlement contracts",
      "Work with auditors and own remediation",
      "Improve testing, fuzzing and release tooling",
    ],
    demonstrates: "A pledged role that closes on time: the pledge is KEPT and the bond returns.",
  },
  {
    slug: "developer-relations-lead",
    title: "Developer Relations Lead",
    location: { city: "New York", region: "NY", country: "US" },
    salary: { min: 140000, max: 175000 },
    datePosted: "2026-10-12",
    validThrough: "2027-01-31",
    pledgeCode: "realrole-2-2d5cbf75",
    closed: false,
    summary:
      "Lead our developer community: documentation, workshops and the feedback loop between builders and the product team.",
    responsibilities: [
      "Own docs, tutorials and sample apps",
      "Run workshops and hackathon presence",
      "Turn developer feedback into product priorities",
    ],
    demonstrates: "A pledged role whose pay range is later removed: the pledge BREAKS and applicants are paid.",
  },
  {
    slug: "data-analyst",
    title: "Data Analyst",
    location: { city: "Chicago", region: "IL", country: "US" },
    salary: null,
    datePosted: "2026-10-12",
    validThrough: "2027-01-31",
    pledgeCode: null,
    closed: false,
    summary: "Turn on-chain and product data into decisions for the growth and risk teams.",
    responsibilities: ["Build dashboards and metrics", "Partner with growth and risk", "Own data quality checks"],
    demonstrates: "No pay range in Illinois, where a pay-transparency rule applies: MISSING_RANGE.",
  },
  {
    slug: "senior-product-designer",
    title: "Senior Product Designer",
    location: { city: "San Francisco", region: "CA", country: "US" },
    salary: { min: 90000, max: 250000 },
    datePosted: "2026-10-12",
    validThrough: "2027-01-31",
    pledgeCode: null,
    closed: false,
    summary: "Shape the wallet and payments experience across web and mobile.",
    responsibilities: ["Own end-to-end product design", "Run research with users", "Grow our design system"],
    demonstrates: "A range wider than 2× ($90K–$250K): TOO_WIDE.",
  },
];

export function jobPostingJsonLd(job: DemoJob, url: string) {
  const description = [
    `<p>${job.summary}</p>`,
    `<ul>${job.responsibilities.map((r) => `<li>${r}</li>`).join("")}</ul>`,
    job.pledgeCode ? `<p>RealRole pledge: ${job.pledgeCode}</p>` : "",
  ].join("");
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: "FULL_TIME",
    url,
    hiringOrganization: { "@type": "Organization", name: `${DEMO_COMPANY} (RealRole demo employer)` },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressRegion: job.location.region,
        addressCountry: job.location.country,
      },
    },
    ...(job.salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "USD",
            value: { "@type": "QuantitativeValue", minValue: job.salary.min, maxValue: job.salary.max, unitText: "YEAR" },
          },
        }
      : {}),
  };
}

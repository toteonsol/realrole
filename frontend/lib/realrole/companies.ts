export type Segment = "web2" | "web3";
export type Ats = "greenhouse" | "lever" | "ashby";

export interface Company {
  name: string;
  ats: Ats;
  board: string;
  segment: Segment;
}

/** Public job boards that validators (and browsers) can read directly. */
export const COMPANIES: Company[] = [
  { name: "Stripe", ats: "greenhouse", board: "stripe", segment: "web2" },
  { name: "Airbnb", ats: "greenhouse", board: "airbnb", segment: "web2" },
  { name: "OpenAI", ats: "ashby", board: "openai", segment: "web2" },
  { name: "Figma", ats: "greenhouse", board: "figma", segment: "web2" },
  { name: "Notion", ats: "ashby", board: "notion", segment: "web2" },
  { name: "Ramp", ats: "ashby", board: "ramp", segment: "web2" },
  { name: "Spotify", ats: "lever", board: "spotify", segment: "web2" },
  { name: "Palantir", ats: "lever", board: "palantir", segment: "web2" },
  { name: "Discord", ats: "greenhouse", board: "discord", segment: "web2" },
  { name: "Robinhood", ats: "greenhouse", board: "robinhood", segment: "web2" },
  { name: "Coinbase", ats: "greenhouse", board: "coinbase", segment: "web3" },
  { name: "Uniswap", ats: "ashby", board: "uniswap", segment: "web3" },
  { name: "Polymarket", ats: "ashby", board: "polymarket", segment: "web3" },
  { name: "Phantom", ats: "ashby", board: "phantom", segment: "web3" },
  { name: "Paradigm", ats: "ashby", board: "paradigm", segment: "web3" },
  { name: "OKX", ats: "greenhouse", board: "okx", segment: "web3" },
  { name: "Ripple", ats: "greenhouse", board: "ripple", segment: "web3" },
  { name: "Gemini", ats: "greenhouse", board: "gemini", segment: "web3" },
  { name: "Crypto.com", ats: "lever", board: "crypto", segment: "web3" },
  { name: "Binance", ats: "lever", board: "binance", segment: "web3" },
  { name: "Anchorage", ats: "lever", board: "anchorage", segment: "web3" },
];

export const WEB3_BOARDS = new Set(COMPANIES.filter((c) => c.segment === "web3").map((c) => c.board));

export function companyFor(board: string): Company | undefined {
  return COMPANIES.find((c) => c.board === board);
}

export interface LiveJob {
  id: string;
  title: string;
  location: string;
  postedTs: number;
  url: string;
}

/** Read a company's open roles straight from its public job board (all three allow browser requests). */
export async function fetchBoard(c: Company): Promise<LiveJob[]> {
  if (c.ats === "greenhouse") {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${c.board}/jobs`);
    const d = await r.json();
    return (d.jobs ?? []).map((j: any) => ({
      id: String(j.id),
      title: j.title,
      location: j.location?.name ?? "",
      postedTs: Date.parse(j.first_published ?? j.updated_at ?? "") / 1000 || 0,
      url: `https://job-boards.greenhouse.io/${c.board}/jobs/${j.id}`,
    }));
  }
  if (c.ats === "lever") {
    const r = await fetch(`https://api.lever.co/v0/postings/${c.board}?mode=json`);
    const d = await r.json();
    return (Array.isArray(d) ? d : []).map((j: any) => ({
      id: j.id,
      title: j.text,
      location: j.categories?.location ?? "",
      postedTs: Math.floor((j.createdAt ?? 0) / 1000),
      url: j.hostedUrl ?? `https://jobs.lever.co/${c.board}/${j.id}`,
    }));
  }
  const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${c.board}`);
  const d = await r.json();
  return (d.jobs ?? [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) => ({
      id: j.id,
      title: j.title,
      location: j.location ?? "",
      postedTs: Date.parse(j.publishedAt ?? "") / 1000 || 0,
      url: j.jobUrl ?? `https://jobs.ashbyhq.com/${c.board}/${j.id}`,
    }));
}

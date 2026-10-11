import type { PayRange, PledgeStatus, Verdict } from "../contracts/RealRole";

export interface ParsedPosting {
  ats: "greenhouse" | "lever" | "ashby" | "jsonld";
  board: string;
  jobId: string;
  label: string;
}

/** Turn a pasted job URL into the (ats, board, job_id) triple the contract expects. */
export function parsePostingUrl(input: string): ParsedPosting | null {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  const ghJid = url.searchParams.get("gh_jid");

  if ((host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") && parts.length >= 3 && parts[1] === "jobs") {
    return { ats: "greenhouse", board: parts[0].toLowerCase(), jobId: parts[2], label: "Greenhouse" };
  }
  if (host === "boards-api.greenhouse.io" && parts[0] === "v1" && parts[1] === "boards" && parts[3] === "jobs" && parts[4]) {
    return { ats: "greenhouse", board: parts[2].toLowerCase(), jobId: parts[4], label: "Greenhouse" };
  }
  if (host === "jobs.lever.co" && parts.length >= 2) {
    return { ats: "lever", board: parts[0].toLowerCase(), jobId: parts[1], label: "Lever" };
  }
  if (host === "jobs.ashbyhq.com" && parts.length >= 2) {
    return { ats: "ashby", board: parts[0].toLowerCase(), jobId: parts[1], label: "Ashby" };
  }
  if (ghJid) {
    return null; // company-hosted Greenhouse page: the board slug is not in the URL
  }
  if (url.protocol === "https:") {
    return { ats: "jsonld", board: "", jobId: raw, label: "Careers page (schema.org JobPosting)" };
  }
  return null;
}

export function publicPostingUrl(key: string): string | null {
  const [ats, ...rest] = key.split(":");
  if (ats === "jsonld") return key.slice("jsonld:".length);
  const [board, jobId] = rest;
  if (ats === "greenhouse") return `https://job-boards.greenhouse.io/${board}/jobs/${jobId}`;
  if (ats === "lever") return `https://jobs.lever.co/${board}/${jobId}`;
  if (ats === "ashby") return `https://jobs.ashbyhq.com/${board}/${jobId}`;
  return null;
}

export function keyToArgs(key: string): [string, string, string] {
  if (key.startsWith("jsonld:")) return ["jsonld", "", key.slice(7)];
  const [ats, board, jobId] = key.split(":");
  return [ats, board, jobId];
}

export const VERDICT_INFO: Record<Verdict, { label: string; tone: "good" | "bad" | "warn" | "neutral"; help: string }> = {
  COMPLIANT: { label: "Honest range", tone: "good", help: "A pay range is published and is no wider than 2x." },
  MISSING_RANGE: { label: "Missing range", tone: "bad", help: "A pay-transparency rule applies to this role, but no range is published." },
  TOO_WIDE: { label: "Range too wide", tone: "warn", help: "The top of the range is more than 2x the bottom (RealRole honest-range standard)." },
  INVALID_RANGE: { label: "Invalid range", tone: "bad", help: "The published range is zero or inverted." },
  NO_RANGE_UNREGULATED: { label: "No range (no rule)", tone: "neutral", help: "No range is published, and no listed pay-transparency rule applies." },
  CLOSED: { label: "Closed", tone: "neutral", help: "The posting is no longer live at its source." },
};

export const FLAG_INFO: Record<string, string> = {
  STALE: "Open for more than 90 days",
  PAY_FROM_DESCRIPTION: "Range read from the description text",
  PAY_LAW_APPLIES: "A pay-transparency rule applies",
};

export const PLEDGE_INFO: Record<PledgeStatus, { label: string; tone: "good" | "bad" | "warn" | "neutral" }> = {
  PENDING_PROOF: { label: "Awaiting proof", tone: "warn" },
  ACTIVE: { label: "Active", tone: "good" },
  FILLED_PENDING_CLOSE: { label: "Filled, must close", tone: "warn" },
  KEPT: { label: "Kept", tone: "good" },
  BROKEN: { label: "Broken", tone: "bad" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
  UNVERIFIABLE: { label: "Unverifiable", tone: "neutral" },
};

export function formatPay(r: PayRange | null | undefined): string {
  if (!r) return "None published";
  const unit = r.interval === "YEAR" ? "yr" : r.interval.toLowerCase();
  const fmt = (cents: number) => {
    const v = cents / 100;
    const opts: Intl.NumberFormatOptions =
      v >= 1000 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency || "USD", ...opts }).format(v);
    } catch {
      return `${r.currency} ${v.toLocaleString()}`;
    }
  };
  return r.min === r.max ? `${fmt(r.min)} / ${unit}` : `${fmt(r.min)} – ${fmt(r.max)} / ${unit}`;
}

export function formatGen(wei: string | bigint): string {
  const v = typeof wei === "bigint" ? wei : BigInt(wei || "0");
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""} GEN`;
}

export function parseGen(input: string): bigint {
  const [w, f = ""] = input.trim().split(".");
  if (!/^\d+$/.test(w || "0") || !/^\d*$/.test(f)) throw new Error("Enter a GEN amount like 0.05");
  return BigInt(w || "0") * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18));
}

export function timeAgo(ts: number): string {
  if (!ts) return "never";
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

/** SHA-256 of an application receipt, computed in the browser. Only the hash leaves the device. */
export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

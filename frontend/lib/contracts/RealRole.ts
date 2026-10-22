import { createClient } from "genlayer-js";
import "../genlayer/gasMargin";
import { CHAIN } from "../genlayer/client";
import { estimateWriteFeePreset, feePresetToTransactionFees } from "../genlayer/fees";

export type Verdict =
  | "COMPLIANT"
  | "MISSING_RANGE"
  | "TOO_WIDE"
  | "INVALID_RANGE"
  | "NO_RANGE_UNREGULATED"
  | "CLOSED";

export interface PayRange {
  min: number; // cents
  max: number; // cents
  currency: string;
  interval: string;
}

export interface PostingFacts {
  http: number;
  live: boolean;
  title: string;
  locations: string[];
  remote: boolean;
  pay: PayRange[];
  posted_ts: number;
  code_present: boolean;
  jurisdictions: string[];
  text_pay: PayRange | null;
}

export interface Posting {
  key: string;
  ats: string;
  board: string;
  job_id: string;
  title: string;
  live: boolean;
  verdict: Verdict;
  flags: string;
  facts: PostingFacts | null;
  last_audit_ts: number;
  audit_count: number;
  pledge_id: number;
}

export interface AuditRow {
  posting_key: string;
  ts: number;
  verdict: Verdict;
  flags: string;
  trigger: string;
  auditor: string;
  facts: PostingFacts | null;
}

export interface Scorecard {
  board: string;
  postings: number;
  COMPLIANT: number;
  MISSING_RANGE: number;
  TOO_WIDE: number;
  INVALID_RANGE: number;
  NO_RANGE_UNREGULATED: number;
  CLOSED: number;
  STALE: number;
  PLEDGES_KEPT: number;
  PLEDGES_BROKEN: number;
}

export type PledgeStatus =
  | "PENDING_PROOF"
  | "ACTIVE"
  | "FILLED_PENDING_CLOSE"
  | "KEPT"
  | "BROKEN"
  | "WITHDRAWN"
  | "UNVERIFIABLE";

export interface Pledge {
  id: number;
  posting_key: string;
  employer: string;
  bond: string;
  window_days: number;
  code: string;
  status: PledgeStatus;
  created_ts: number;
  activated_ts: number;
  deadline_ts: number;
  filled_ts: number;
  last_check_ts: number;
  settled_ts: number;
  outcome: string;
  enforcer: string;
  applicant_count: number;
  applicant_stake?: string;
  unavailable_count?: number;
  closed_seen_ts?: number;
  evidence?: string;
}

export interface PayoutRow {
  pledge_id: number;
  to: string;
  amount: string;
  reason: string;
  ts: number;
}

export interface Stats {
  postings: number;
  audits: number;
  boards: number;
  pledges: number;
  cooldown_s: number;
}

export type TxStage = "estimating" | "signing" | "deciding" | "accepted" | "failed";

export interface TxOutcome {
  hash: string;
  ok: boolean;
  returned: unknown;
  error?: string;
  votes?: Record<string, string>;
}

/** GenLayer calldata decodes dicts as Maps; turn them into plain objects. */
export function toPlain(value: any): any {
  if (value instanceof Map) {
    const out: Record<string, any> = {};
    for (const [k, v] of value.entries()) out[String(k)] = toPlain(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  return value;
}

function parseFacts(raw: unknown): PostingFacts | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeReturn(leader: any): unknown {
  const readable = leader?.result?.payload?.readable;
  if (typeof readable !== "string") return undefined;
  try {
    return JSON.parse(readable);
  } catch {
    return readable;
  }
}

/**
 * Normalise a write receipt. Studio-style networks expose consensus_data with
 * the leader receipt; Bradbury exposes txExecutionResultName and lastRound votes.
 */
export function readReceipt(receipt: any): Pick<TxOutcome, "ok" | "votes" | "returned" | "error"> {
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  if (leader) {
    const ok = leader.execution_result === "SUCCESS";
    return {
      ok,
      votes: receipt?.consensus_data?.votes,
      returned: decodeReturn(leader),
      error: ok ? undefined : String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? "Execution failed"),
    };
  }
  const exec = receipt?.txExecutionResultName;
  // The SDK's wait call may return only a numeric status (13 = LEADER_TIMEOUT) without a name.
  const status: string | undefined =
    receipt?.statusName ?? ({ 12: "UNDETERMINED", 13: "LEADER_TIMEOUT", 14: "VALIDATORS_TIMEOUT" } as Record<number, string>)[Number(receipt?.status)];
  if (status === "LEADER_TIMEOUT" || status === "UNDETERMINED" || status === "VALIDATORS_TIMEOUT") {
    return { ok: false, votes: undefined, returned: undefined, error: `CONSENSUS_${status}` };
  }
  if (exec === "NOT_VOTED") {
    return { ok: false, votes: undefined, returned: undefined, error: "CONSENSUS_LEADER_TIMEOUT" };
  }
  const ok = exec ? exec === "FINISHED_WITH_RETURN" : true;
  const names: string[] = receipt?.lastRound?.validatorVotesName ?? [];
  const votes = Object.fromEntries(names.map((v, i) => [String(i), v === "AGREE" ? "agree" : v === "TIMEOUT" ? "idle" : "disagree"]));
  return { ok, votes, returned: undefined, error: ok ? undefined : `Execution ${exec ?? "failed"}` };
}

export class RealRoleContract {
  private client: any;

  constructor(private address: `0x${string}`, account?: string | null) {
    this.client = createClient({
      chain: CHAIN,
      ...(account ? { account: account as `0x${string}` } : {}),
    });
  }

  private async read(functionName: string, args: unknown[] = []): Promise<any> {
    const result = await this.client.readContract({ address: this.address, functionName, args });
    return toPlain(result);
  }

  async stats(): Promise<Stats> {
    return this.read("get_stats");
  }

  async postings(offset = 0, limit = 50): Promise<Posting[]> {
    const rows: any[] = await this.read("get_postings", [offset, limit]);
    return rows.map((p) => ({ ...p, facts: parseFacts(p.facts) }));
  }

  async posting(ats: string, board: string, jobId: string): Promise<Posting | null> {
    const p = await this.read("get_posting", [ats, board, jobId]);
    if (!p || !p.key) return null;
    return { ...p, facts: parseFacts(p.facts) };
  }

  async postingAudits(key: string, limit = 20): Promise<AuditRow[]> {
    const rows: any[] = await this.read("get_posting_audits", [key, limit]);
    return rows.map((a) => ({ ...a, facts: parseFacts(a.facts) }));
  }

  async recentAudits(limit = 20): Promise<AuditRow[]> {
    const rows: any[] = await this.read("get_recent_audits", [limit]);
    return rows.map((a) => ({ ...a, facts: parseFacts(a.facts) }));
  }

  async scorecards(): Promise<Scorecard[]> {
    return this.read("get_scorecards");
  }

  async pledges(offset = 0, limit = 50): Promise<Pledge[]> {
    return this.read("get_pledges", [offset, limit]);
  }

  async payouts(pledgeId: number): Promise<PayoutRow[]> {
    return this.read("get_payouts", [pledgeId]);
  }

  async owed(who: string): Promise<string> {
    return this.read("get_owed", [who]);
  }

  async accounting(): Promise<{ balance: string; owed: string; locked: string; burned: string; solvent: boolean }> {
    return this.read("get_accounting");
  }

  async isApplicant(pledgeId: number, who: string): Promise<boolean> {
    return this.read("is_applicant", [pledgeId, who]);
  }

  /**
   * Submit a write and follow it through consensus. Calls onStage as the
   * transaction moves from wallet signature to a validator decision.
   */
  async write(
    functionName: string,
    args: unknown[],
    onStage: (stage: TxStage, hash?: string) => void,
    value: bigint = 0n,
  ): Promise<TxOutcome> {
    const request = { address: this.address, functionName, args, value };
    onStage("estimating");
    let fees: Record<string, unknown> | undefined;
    try {
      fees = feePresetToTransactionFees(await estimateWriteFeePreset(this.client, request));
    } catch {
      fees = undefined; // gasless networks (Studionet) have nothing to estimate
    }

    onStage("signing");
    const hash: string = await this.client.writeContract({ ...request, ...(fees ? { fees } : {}) });

    onStage("deciding", hash);
    const receipt: any = await this.client.waitForTransactionReceipt({
      hash,
      status: "ACCEPTED",
      retries: 120,
      interval: 5000,
    });
    const { ok, votes, returned, error } = readReceipt(receipt);
    onStage(ok ? "accepted" : "failed", hash);
    return { hash, ok, returned, votes, error };
  }
}

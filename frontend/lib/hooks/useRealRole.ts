"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RealRoleContract, type TxOutcome, type TxStage } from "../contracts/RealRole";
import { getContractAddress, isOnGenLayerNetwork, switchToGenLayerNetwork } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";

export function useRealRole(): RealRoleContract | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  return useMemo(
    () => (contractAddress ? new RealRoleContract(contractAddress as `0x${string}`, address) : null),
    [contractAddress, address],
  );
}

const REFRESH_MS = 15000;

export function useStats() {
  const c = useRealRole();
  return useQuery({ queryKey: ["stats"], queryFn: () => c!.stats(), enabled: !!c, refetchInterval: REFRESH_MS });
}

export function usePostings() {
  const c = useRealRole();
  return useQuery({ queryKey: ["postings"], queryFn: () => c!.postings(0, 50), enabled: !!c, refetchInterval: REFRESH_MS });
}

export function useScorecards() {
  const c = useRealRole();
  return useQuery({ queryKey: ["scorecards"], queryFn: () => c!.scorecards(), enabled: !!c, refetchInterval: REFRESH_MS });
}

export function usePostingAudits(key: string | null) {
  const c = useRealRole();
  return useQuery({
    queryKey: ["audits", key],
    queryFn: () => c!.postingAudits(key!, 20),
    enabled: !!c && !!key,
  });
}

export function usePledges() {
  const c = useRealRole();
  return useQuery({ queryKey: ["pledges"], queryFn: () => c!.pledges(0, 50), enabled: !!c, refetchInterval: REFRESH_MS });
}

export function usePayouts(pledgeId: number, enabled: boolean) {
  const c = useRealRole();
  return useQuery({
    queryKey: ["payouts", pledgeId],
    queryFn: () => c!.payouts(pledgeId),
    enabled: !!c && enabled,
  });
}

export function useIsApplicant(pledgeId: number, who: string | null) {
  const c = useRealRole();
  return useQuery({
    queryKey: ["applicant", pledgeId, who],
    queryFn: () => c!.isApplicant(pledgeId, who!),
    enabled: !!c && !!who,
  });
}

export interface TxState {
  stage: TxStage | null;
  hash?: string;
  outcome?: TxOutcome;
  error?: string;
}

/** Runs one contract write at a time and exposes its lifecycle for the UI. */
export function useTx() {
  const c = useRealRole();
  const { address, isConnected, connectWallet } = useWallet();
  const qc = useQueryClient();
  const [state, setState] = useState<TxState>({ stage: null });
  const [last, setLast] = useState<{ functionName: string; args: unknown[]; value: bigint } | null>(null);

  const run = useCallback(
    async (functionName: string, args: unknown[], value: bigint = 0n): Promise<TxOutcome | null> => {
      setLast({ functionName, args, value });
      if (!c) {
        setState({ stage: "failed", error: "Contract address is not configured." });
        return null;
      }
      try {
        // Connect first if needed, then bind the client to the address the wallet returned.
        const account = isConnected && address ? address : await connectWallet();
        if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
        const signer = account === address ? c : new RealRoleContract(getContractAddress() as `0x${string}`, account);
        setState({ stage: "estimating" });
        const outcome = await signer.write(
          functionName,
          args,
          (stage, hash) => setState((s) => ({ ...s, stage, hash: hash ?? s.hash })),
          value,
        );
        setState({ stage: outcome.ok ? "accepted" : "failed", hash: outcome.hash, outcome, error: outcome.error });
        await qc.invalidateQueries();
        return outcome;
      } catch (e: any) {
        const msg = e?.shortMessage || e?.message || String(e);
        setState((s) => ({ ...s, stage: "failed", error: /reject|denied/i.test(msg) ? "You rejected the request in your wallet." : msg }));
        return null;
      }
    },
    [c, address, isConnected, connectWallet, qc],
  );

  const reset = useCallback(() => setState({ stage: null }), []);
  const retry = useCallback(() => (last ? run(last.functionName, last.args, last.value) : Promise.resolve(null)), [last, run]);
  const busy = state.stage === "estimating" || state.stage === "signing" || state.stage === "deciding";
  return { ...state, run, reset, retry, busy };
}

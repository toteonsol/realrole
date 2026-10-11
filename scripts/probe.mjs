// Deploys contracts/ats_probe.py to a network and probes one posting per ATS.
// Usage: node scripts/probe.mjs [studionet|testnetBradbury]
// A throwaway account is generated unless PRIVATE_KEY is set.
import { readFileSync } from "fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import * as chains from "genlayer-js/chains";

const chainName = process.argv[2] || "studionet";
const chain = chains[chainName];
if (!chain) throw new Error(`unknown chain ${chainName}; have ${Object.keys(chains)}`);

const account = createAccount(process.env.PRIVATE_KEY || generatePrivateKey());
const client = createClient({ chain, account });
console.log("chain", chainName, "account", account.address);

const code = new Uint8Array(readFileSync("contracts/ats_probe.py"));
const deployHash = await client.deployContract({ code, args: [] });
const deployed = await client.waitForTransactionReceipt({ hash: deployHash, status: "ACCEPTED", retries: 200 });
const address = deployed.data?.contract_address || deployed.to_address;
if (deployed.consensus_data?.leader_receipt?.[0]?.execution_result !== "SUCCESS") throw new Error("deploy failed: " + JSON.stringify(deployed.consensus_data?.leader_receipt?.[0]?.result));
console.log("deployed", address);

const targets = JSON.parse(process.env.TARGETS || "[]");
for (const [ats, board, jobId] of targets) {
  const hash = await client.writeContract({ address, functionName: "probe", args: [ats, board, jobId], value: 0n });
  const r = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 200 });
  const lr = r.consensus_data?.leader_receipt?.[0]; console.log(ats, board, jobId, "->", r.statusName ?? r.status, lr?.execution_result, JSON.stringify(lr?.result?.payload ?? "").slice(0,300), "votes", JSON.stringify(r.consensus_data?.votes));
}
console.log(JSON.stringify(await client.readContract({ address, functionName: "get_results", args: [] }), null, 2));

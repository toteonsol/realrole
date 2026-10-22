import "./gasmargin.mjs";
// Call a RealRole method from the command line and print the outcome.
//   node scripts/call.mjs <network> write <method> [jsonArgs] [valueWei]
//   node scripts/call.mjs <network> read  <method> [jsonArgs]
import { readFileSync, existsSync } from "fs";
import { createClient, createAccount } from "genlayer-js";
import * as chains from "genlayer-js/chains";

const [chainName, mode, method, rawArgs = "[]", value = "0"] = process.argv.slice(2);
const chain = chains[chainName];
const { address } = JSON.parse(readFileSync(`deployments.${chainName}.json`, "utf8"));
const keyFile = `.demo-key.${chainName}`;
const key = process.env.PRIVATE_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf8").trim() : undefined);
const client = (createClient({ chain, ...(key ? { account: createAccount(key) } : {}) }));
const args = JSON.parse(rawArgs);
const show = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

if (mode === "read") {
  console.log(show(await client.readContract({ address, functionName: method, args })));
} else {
  const hash = await client.writeContract({ address, functionName: method, args, value: BigInt(value) });
  console.log("tx", hash);
  const r = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 300, interval: 5000 });
  const leader = r.consensus_data?.leader_receipt?.[0];
  if (leader) {
    console.log("status", r.statusName ?? r.status, "| execution", leader.execution_result, "| votes", show(r.consensus_data?.votes));
    console.log("result", show(leader.result?.payload ?? leader.result));
  } else {
    console.log("status", r.statusName, "| execution", r.txExecutionResultName, "| votes", (r.lastRound?.validatorVotesName ?? []).join(","));
  }
}

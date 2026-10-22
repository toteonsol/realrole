import "./gasmargin.mjs";
// Live pledge-lifecycle evidence on Bradbury. Every write is logged with its tx hash,
// consensus votes and the wallet balances around it, into evidence/bradbury-v2.json.
//
//   node scripts/evidence.mjs setup     fund wallets, create + activate pledges, register applicants
//   node scripts/evidence.mjs kept      (after the Protocol Engineer page is closed) prove closure, refund
//   node scripts/evidence.mjs broken    (after pledge #2's deadline) enforce, pay out, withdraw everyone
//   node scripts/evidence.mjs readback  final authoritative contract state
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const RPC = "https://rpc-bradbury.genlayer.com";
const chain = { id: 4221, name: "Bradbury", nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const pc = createPublicClient({ chain, transport: http(RPC) });
const { address: CONTRACT } = JSON.parse(readFileSync("deployments.testnetBradbury.json", "utf8"));
const SITE = "https://realrole-one.vercel.app/demo/careers";
const BURN = "0x000000000000000000000000000000000000dEaD";
const BOND = parseEther("0.1");
const LOG = "evidence/bradbury-v2.json";

function key(name) {
  const f = `.demo-key.${name}`;
  if (!existsSync(f)) writeFileSync(f, generatePrivateKey(), { mode: 0o600 });
  return readFileSync(f, "utf8").trim();
}
const W = {
  employer: key("testnetBradbury"),
  applicant1: key("applicant"),
  applicant2: key("applicant2"),
  enforcer: key("enforcer"),
};
const addr = (k) => privateKeyToAccount(k).address;
const gl = (k) => (createClient({ chain: testnetBradbury, account: createAccount(k) }));
const reader = createClient({ chain: testnetBradbury });
const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, "utf8")) : { contract: CONTRACT, network: "testnetBradbury (4221)", steps: [] };
const save = () => { mkdirSync("evidence", { recursive: true }); writeFileSync(LOG, JSON.stringify(log, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2)); };
const big = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x instanceof Map ? Object.fromEntries(x) : x)));

async function balances() {
  const out = {};
  for (const [n, k] of Object.entries(W)) out[n] = formatEther(await pc.getBalance({ address: addr(k) }));
  out.burn = formatEther(await pc.getBalance({ address: BURN }));
  out.contract = formatEther(await pc.getBalance({ address: CONTRACT }));
  return out;
}
async function read(fn, args = []) {
  return big(await reader.readContract({ address: CONTRACT, functionName: fn, args }));
}
async function write(who, fn, args = [], value = 0n, note = "") {
  const before = await balances();
  const hash = await gl(W[who]).writeContract({ address: CONTRACT, functionName: fn, args, value });
  const r = await gl(W[who]).waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 400, interval: 5000 });
  const tx = await reader.getTransaction({ hash });
  const step = {
    step: `${who}.${fn}(${args.join(", ")})${value ? ` value=${formatEther(value)} GEN` : ""}`, note,
    tx: hash, explorer: `https://explorer-bradbury.genlayer.com/tx/${hash}`,
    status: tx.statusName, execution: tx.txExecutionResultName, votes: tx.lastRound?.validatorVotesName,
    balances_before: before, balances_after: await balances(),
  };
  log.steps.push(step); save();
  console.log(`${step.step} -> ${step.status} ${step.execution} [${(step.votes || []).join(",")}]`);
  if (step.execution !== "FINISHED_WITH_RETURN") throw new Error(`step failed: ${fn}`);
  return step;
}
async function fund(name, amount) {
  const wc = createWalletClient({ account: privateKeyToAccount(W.employer), chain, transport: http(RPC) });
  const have = await pc.getBalance({ address: addr(W[name]) });
  if (have >= amount) return;
  const h = await wc.sendTransaction({ to: addr(W[name]), value: amount - have });
  await pc.waitForTransactionReceipt({ hash: h });
  console.log(`funded ${name} ${addr(W[name])}`);
}

const phase = process.argv[2];
log.wallets = Object.fromEntries(Object.entries(W).map(([n, k]) => [n, addr(k)]));

if (phase === "setup") {
  for (const n of ["applicant1", "applicant2", "enforcer"]) await fund(n, parseEther("0.03"));
  const count = (await read("get_stats")).pledges;
  if (count < 1) await write("employer", "create_pledge", ["jsonld", "", `${SITE}/protocol-engineer`, 40], BOND, "Pledge #1: to be KEPT (closure proven before deadline)");
  else log.steps.push({ step: "employer.create_pledge(protocol-engineer, 40) value=0.1 GEN", note: "Pledge #1 created earlier in this run; see pledge read-back", tx: "see readback" });
  if (count < 2) await write("employer", "create_pledge", ["jsonld", "", `${SITE}/developer-relations-lead`, 8], BOND, "Pledge #2: to be BROKEN (left open past deadline)");
  for (const pid of [1, 2]) {
    if ((await read("get_pledge", [pid])).status === "PENDING_PROOF") await write("enforcer", "activate_pledge", [pid], 0n, "Validators find the pledge code on the posting");
  }
  const stake = BigInt((await read("get_pledge", [2])).applicant_stake);
  const h1 = "a1".repeat(32), h2 = "b2".repeat(32);
  await write("applicant1", "register_applicant", [2, h1], stake, "Staked applicant registration");
  await write("applicant2", "register_applicant", [2, h2], stake, "Staked applicant registration");
  log.after_setup = { pledge1: await read("get_pledge", [1]), pledge2: await read("get_pledge", [2]), accounting: await read("get_accounting") };
  save();
}

if (phase === "kept") {
  await write("enforcer", "check_pledge", [1], 0n, "Posting is closed and deadline not reached: KEPT");
  const owed = await read("get_owed", [addr(W.employer)]);
  await write("employer", "withdraw", [], 0n, `Employer pulls refund (owed ${formatEther(BigInt(owed))} GEN)`);
  log.after_kept = { pledge1: await read("get_pledge", [1]), payouts1: await read("get_payouts", [1]), accounting: await read("get_accounting") };
  save();
}

if (phase === "broken") {
  await write("enforcer", "check_pledge", [2], 0n, "Posting still live after deadline: BROKEN");
  log.payouts2 = await read("get_payouts", [2]);
  for (const n of ["applicant1", "applicant2", "enforcer"]) {
    const owed = await read("get_owed", [addr(W[n])]);
    await write(n, "withdraw", [], 0n, `${n} pulls ${formatEther(BigInt(owed))} GEN`);
  }
  log.after_broken = { pledge2: await read("get_pledge", [2]), accounting: await read("get_accounting") };
  save();
}

if (phase === "finality") {
  for (const st of log.steps.filter((x) => x.tx && x.tx.startsWith("0x"))) {
    const t = await reader.getTransaction({ hash: st.tx });
    st.final_status = t.statusName;
    console.log(st.step.slice(0, 60).padEnd(60), t.statusName, t.txExecutionResultName);
  }
  save();
}

if (phase === "readback") {
  log.readback = {
    stats: await read("get_stats"), accounting: await read("get_accounting"),
    pledge1: await read("get_pledge", [1]), pledge2: await read("get_pledge", [2]),
    payouts1: await read("get_payouts", [1]), payouts2: await read("get_payouts", [2]),
    withdrawals: Object.fromEntries(await Promise.all(Object.entries(W).map(async ([n, k]) => [n, await read("get_withdrawals", [addr(k)])]))),
    balances: await balances(),
  };
  save();
  console.log(JSON.stringify(log.readback.accounting), JSON.stringify(log.readback.balances));
}

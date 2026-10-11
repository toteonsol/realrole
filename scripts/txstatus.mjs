// Show a Bradbury transaction's consensus state: node scripts/txstatus.mjs <txHash>
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const c = createClient({ chain: testnetBradbury });
const tx = await c.getTransaction({ hash: process.argv[2] });
console.log({ statusName: tx.statusName, resultName: tx.resultName, exec: tx.txExecutionResultName, rounds: String(tx.numOfRounds), votes: tx.lastRound?.validatorVotesName, queue: tx.queueType, pos: String(tx.queuePosition) });

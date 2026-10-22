// Deploy RealRole. Usage:
//   PRIVATE_KEY=0x... node scripts/deploy.mjs <studionet|testnetBradbury> [cooldown_s]
// Without PRIVATE_KEY a throwaway key is generated (fine for gasless Studionet).
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import * as chains from "genlayer-js/chains";

const chainName = process.argv[2] || "studionet";
const cooldown = Number(process.argv[3] || 60);
const chain = chains[chainName];
if (!chain) throw new Error(`unknown chain ${chainName}; have ${Object.keys(chains)}`);

const keyFile = `.demo-key.${chainName}`;
const key = process.env.PRIVATE_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf8").trim() : generatePrivateKey());
const account = createAccount(key);
const client = createClient({ chain, account });
console.log(`network ${chainName} (chain ${chain.id}) deployer ${account.address}`);

// Deploy the compressed build (scripts/build_contract.py): Bradbury caps tx gas below what the 33 KB source needs.
const contractFile = process.env.REALROLE_FILE || "build/realrole.deploy.py";
const code = new Uint8Array(readFileSync(contractFile));
console.log(`contract ${contractFile} (${code.length} bytes)`);
const dayS = Number(process.argv[4] || 86400);
const hash = await client.deployContract({ code, args: [cooldown, dayS] });
console.log("deploy tx", hash);
const receipt = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 300, interval: 5000 });
const leader = receipt.consensus_data?.leader_receipt?.[0];
if (leader && leader.execution_result !== "SUCCESS") {
  throw new Error("deploy failed: " + JSON.stringify(leader.result));
}
const address = receipt.data?.contract_address || receipt.txDataDecoded?.contractAddress || receipt.to_address;
console.log("RealRole deployed at", address);
writeFileSync(`deployments.${chainName}.json`, JSON.stringify({ chain: chainName, chainId: chain.id, address, deployTx: hash, cooldown, dayS, deployedAt: new Date().toISOString() }, null, 2));
if (!process.env.PRIVATE_KEY && !existsSync(keyFile)) writeFileSync(keyFile, key, { mode: 0o600 });

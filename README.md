# RealRole

**Honest job postings, verified by GenLayer consensus.**

**Live app:** https://realrole-one.vercel.app · **Contract (Bradbury):** [`0xB3b7…980A`](https://explorer-bradbury.genlayer.com/address/0xB3b7F0B04ff28f19561FC6906965101120Fa980A)

RealRole puts public job postings on the record. Independent GenLayer validators read each posting straight from the employer's own hiring system, agree on the facts, and an Intelligent Contract stamps a pay-transparency verdict that no company, server or AI model can quietly change. Employers who mean it can bond GEN behind a **Real Role Pledge**: a promise that the posting keeps an honest pay range and does not linger as a ghost job.

## The problem

- **Ghost jobs.** Many postings stay up for months with no intent to hire, wasting candidates' time and inflating "we're hiring" signals.
- **Hidden pay.** Pay-transparency rules now cover New York City, California, Colorado, Washington, Illinois and more, plus the EU Pay Transparency Directive. Enforcement is close to zero, and there is no neutral public record of who complies.
- **No trusted referee.** A job board, a scraper or a single AI model can be wrong, captured or edited later. Candidates and honest employers both need a record neither side controls.

## Why GenLayer is central

The judgement here needs web access and interpretation, which normal smart contracts and oracles cannot do:

1. **Live, authoritative data.** Validators fetch the posting from the employer's ATS feed (Greenhouse, Lever, Ashby public APIs) or from schema.org `JobPosting` JSON-LD on a careers page. Each validator fetches independently.
2. **AI observes, contract decides.** Deterministic code parses the structured pay fields. The LLM only (a) maps messy location text to a **closed list** of pay-rule jurisdictions and (b) reads a pay range written in prose when the ATS field is empty. Its output is sanitised against fixed vocabularies, so prompt injection inside a posting cannot invent jurisdictions or numbers.
3. **Custom equivalence.** Validators re-run the observation and must match the leader exactly on deterministic facts (HTTP status, live/closed, title, locations, structured pay, posting date, pledge-code presence). They must also agree on whether a pay rule applies and on the final verdict, and on any prose-read range within 2%.
4. **Deterministic settlement.** Verdicts, pledge transitions and every payout are computed in contract code from the agreed facts. The AI never chooses a winner, a recipient or an amount.

## What it does

### Layer 1: open audits (no sign-up)

Anyone can audit a posting. The contract records:

| Verdict | Meaning |
|---|---|
| `COMPLIANT` | A range is published and max ≤ 2× min (the RealRole honest-range standard) |
| `MISSING_RANGE` | A listed pay-transparency rule applies, but no range is published |
| `TOO_WIDE` | A range is published but is wider than 2× |
| `INVALID_RANGE` | The range is zero or inverted |
| `NO_RANGE_UNREGULATED` | No range, and no listed rule applies (informational) |
| `CLOSED` | Source returns 404/410, the job is unlisted, or `validThrough` has passed |

Flags: `STALE` (open 90+ days, a common ghost-job signal), `PAY_FROM_DESCRIPTION`, `PAY_LAW_APPLIES`.

Every audit is kept in an on-chain history. Per-employer scorecards count each posting once, under its latest verdict, plus permanent pledge results.

### Layer 2: the Real Role Pledge

1. `create_pledge` (payable). The employer bonds GEN (≥ 0.01) behind a posting and picks a window of 7–180 days. The contract issues a code like `realrole-3-9f2c1ab0`.
2. The employer puts the code in the posting text. **This proves control**: only someone who can edit the posting can activate it.
3. `activate_pledge`. Validators confirm the posting is live, contains the code and has a `COMPLIANT` range. The clock starts.
4. Applicants call `register_applicant` with a SHA-256 hash of their application receipt. The hash is computed in the browser and the file never leaves the device.
5. Anyone can call `check_pledge` (rate-limited):
   - posting closed in time → **KEPT**, bond returned
   - employer called `mark_filled` and the posting closed within 14 days → **KEPT**
   - still open past the deadline → **BROKEN** (`LINGERED_PAST_DEADLINE`)
   - still open 14+ days after being marked filled → **BROKEN** (`ZOMBIE_AFTER_FILL`)
   - range removed or made dishonest → **BROKEN** (`PAY_TERMS_BROKEN_*`)
6. A broken bond pays **90% split equally among registered applicants and 10% to the enforcer** who proved it (100% to the enforcer if nobody registered). Every payout is written to an on-chain ledger (`get_payouts`).
7. **Funds are never locked.** `withdraw_pending` refunds unactivated pledges, and `reclaim_unverifiable` returns the bond if the source stopped answering for 30 days after the deadline.

## Live deployments

| Network | Contract | Explorer |
|---|---|---|
| **Testnet Bradbury** (chain 4221) | `0xB3b7F0B04ff28f19561FC6906965101120Fa980A` | https://explorer-bradbury.genlayer.com/address/0xB3b7F0B04ff28f19561FC6906965101120Fa980A |
| Studionet (chain 61999) | `0x6b5b9E20ec672d1D63AdbEF9d42B3F560bE6dB33` | https://explorer-studio.genlayer.com/address/0x6b5b9E20ec672d1D63AdbEF9d42B3F560bE6dB33 |

The Bradbury contract uses a 6-hour cooldown between re-audits and pledge checks. The Studionet demo uses 60 seconds.

Real audits on the record (Bradbury and Studionet, each decided by validator consensus):

| Posting | Verdict | Why |
|---|---|---|
| Uniswap · Staff Backend Engineer (Ashby) | COMPLIANT + STALE | $207K–$259K, NYC; open since March |
| Coinbase · intern (Greenhouse) | COMPLIANT | $40/hr, NYC + US remote |
| Gemini · Growth Marketing (Greenhouse) | COMPLIANT + PAY_FROM_DESCRIPTION | Range only in the description text; read by the LLM |
| Ripple · Manager, Software Engineering (Greenhouse) | MISSING_RANGE | Chicago, Illinois rule applies, no range |
| Ripple · Customer Success Sr Manager (Greenhouse) | MISSING_RANGE | Posting is also attached to the San Francisco office |
| Binance · Taipei engineer (Lever) | NO_RANGE_UNREGULATED + STALE | No listed rule applies in Taiwan |

## Run it

Requirements: Python 3.12+, Node 18+.

```bash
# contract tooling
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/genvm-lint check contracts/realrole.py
.venv/bin/python -m pytest tests/direct -q          # 36 tests: verdicts, consensus, pledges, payouts

# build the deployable contract (see "Deploying under Bradbury's gas cap")
.venv/bin/python scripts/build_contract.py contracts/realrole.py build/realrole.deploy.py
RR_CONTRACT=build/realrole.deploy.py .venv/bin/python -m pytest tests/direct -q   # same 36 tests on the build

# deploy (Studionet is gasless; Bradbury needs a funded key in PRIVATE_KEY or .demo-key.testnetBradbury)
npm install
node scripts/deploy.mjs studionet 60                 # args: network, cooldown seconds
node scripts/deploy.mjs testnetBradbury 21600

# poke it from the command line
node scripts/call.mjs studionet write audit_posting '["greenhouse","ripple","8209410"]'
node scripts/call.mjs studionet read get_scorecards

# frontend
cd frontend
printf "NEXT_PUBLIC_GENLAYER_NETWORK=studionet\nNEXT_PUBLIC_CONTRACT_ADDRESS=0x...\n" > .env.local
npm install && npm run dev
```

The frontend reads everything without a wallet. Writes use MetaMask and show the full lifecycle: prepare → sign → validators deciding → consensus, including how many validators agreed and a link to the transaction.

## Deploying under Bradbury's gas cap

Deploy calldata costs about 800 gas per byte, and Bradbury rejects transactions above roughly 16–20M gas. The readable 33 KB source needs about 27M, so `scripts/build_contract.py` produces `build/realrole.deploy.py`. That file is minified (annotations kept, because GenVM storage depends on them), zlib-compressed, and wrapped in a two-line loader that executes the identical code. It is 10 KB, about 8M gas. The full test suite and `genvm-lint` both run against the build, and it was verified end to end on Studionet before deploying to Bradbury.

## Repository

```
contracts/realrole.py        Intelligent Contract (audits, pledges, payouts, views)
contracts/ats_probe.py       Feasibility probe used to confirm validators can reach each ATS
tests/direct/                Direct-mode tests with mocked ATS feeds and LLM, incl. validator replay
scripts/build_contract.py    Minify + compress the contract for deployment
build/realrole.deploy.py     The exact file deployed on-chain
scripts/deploy.mjs           Deploy to studionet / testnetBradbury
scripts/call.mjs             Read or write any method from the CLI
frontend/                    Next.js app (genlayer-js, MetaMask)
```

## Known limits

- Verdicts are informational, not legal advice. The jurisdiction vocabulary is fixed in the contract.
- RealRole cannot prove a hire. The pledge measures what is publicly checkable: the posting closes on time and keeps an honest range.
- Applicant registration takes a receipt hash, not proof of application, so one person could register several wallets. Verified applications are on the roadmap.
- Company-hosted Greenhouse pages (`?gh_jid=`) need the `job-boards.greenhouse.io` link. Workday and iCIMS are not supported yet.

## Roadmap

- **v1.1**: Workday and SmartRecruiters adapters; jurisdiction vocabulary updates via contract upgrade.
- **v2**: browser extension that shows RealRole stamps on LinkedIn, Indeed and company career pages.
- **v2**: verified applicants (zk-email proof of an ATS confirmation email) to stop sybil registration.
- **v3**: bonds in USDC on an EVM chain, with GenLayer as the judge; public API for job boards.

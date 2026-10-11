# Portal submission notes (Projects)

**Title:** RealRole: honest job postings, verified by GenLayer consensus

**Summary (paste into the portal):**

Job seekers lose hours to ghost jobs and to postings that hide pay that pay-transparency rules require. Nobody checks postings at scale, and there is no neutral public record. RealRole is that record. Anyone pastes a public job link. GenLayer validators each fetch the posting straight from the employer's own hiring system (the Greenhouse, Lever and Ashby public APIs, or schema.org JobPosting data on a careers page) and agree on the facts. Code parses the structured pay fields. The LLM only maps messy location text to a closed list of pay-rule jurisdictions (NYC, CA, CO, WA, IL, EU and others) and reads a range written in prose. A custom validator function requires exact agreement on deterministic facts, and on the final verdict. The contract then derives COMPLIANT, MISSING_RANGE, TOO_WIDE, INVALID_RANGE, NO_RANGE_UNREGULATED or CLOSED, flags postings open 90+ days, and keeps per-employer scorecards.

Employers who mean it can bond GEN behind a Real Role Pledge. The contract issues a code that must appear in the posting, which proves the employer controls it. Validators confirm the code and an honest range before the pledge activates. The pledge is kept if the posting closes before its deadline, or within 14 days of being marked filled. It breaks if the posting lingers or drops its range, and then 90% of the bond is split among applicants who registered a receipt hash and 10% goes to the enforcer. Every payout is written to an on-chain ledger, and bonds can always be reclaimed if the source goes silent, so funds are never locked.

Live on GenLayer Testnet Bradbury and Studionet, with real audits of Uniswap, Coinbase, Gemini, Ripple and Binance postings. Two Ripple postings in Illinois and California were found MISSING_RANGE. 36 direct-mode tests cover every verdict, prompt-injection sanitising, fail-closed source errors, validator rejection of tampered facts, and every pledge outcome with exact payouts.

**Links to attach:**
- GitHub repository: https://github.com/toteonsol/realrole
- Live app: https://realrole-one.vercel.app
- Contract (Bradbury): https://explorer-bradbury.genlayer.com/address/0xB3b7F0B04ff28f19561FC6906965101120Fa980A
- Contract (Studionet): https://explorer-studio.genlayer.com/address/0x6b5b9E20ec672d1D63AdbEF9d42B3F560bE6dB33
- Demo video / X post: <optional, earns extra points>

**How to use (for reviewers):**
1. Open the app (no wallet needed to read). The ticker, stats and "The record" tab are live contract reads.
2. "Audit a post": click a real example (e.g. Ripple, Chicago) to see its on-chain verdict, or paste any Greenhouse, Lever or Ashby job URL and run a new audit with MetaMask.
3. "Pledges": create a pledge on a posting you control, paste the code into the posting, activate, then check.
4. "How it works" explains the trust model and known limits.

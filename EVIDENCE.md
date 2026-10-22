# RealRole v2: response to steward review

Every point from the review maps to a contract change, a named test, and live evidence on GenLayer Testnet Bradbury.

**v2 contract (Bradbury, chain 4221):** [`0x51E2a205bfbAEA8b44EffCaA9679a8e0AeB42361`](https://explorer-bradbury.genlayer.com/address/0x51E2a205bfbAEA8b44EffCaA9679a8e0AeB42361)
**Raw evidence log:** [`evidence/bradbury-v2.json`](evidence/bradbury-v2.json). It records every transaction hash, consensus votes, wallet balances before and after, and the final contract read-backs.
**Tests:** `python -m pytest tests/direct -q` → **51 passed**. The same suite also passes against the deployed build (`RR_CONTRACT=build/realrole.deploy.py`).

> **Demonstration timing.** This deployment uses `day_s = 60` (one "pledge day" = 60 s) and a 60 s check cooldown, so deadlines can be shown live. Production uses `day_s = 86400`. The pledge rules are identical; only the clock unit differs.

---

## 1. `reclaim_unverifiable()` could refund without proving the source is unavailable

**Fix**
- New `attest_unavailable()`: validators independently probe the source and must agree it is unreachable. A 200, 404 or 410 counts as an answer, not an outage.
- Each attestation is stored with its HTTP status class in the pledge's evidence log.
- Reclaim requires **3 attestations, after the deadline, spanning ≥ 2 pledge-days**.
- **Any successful check resets the outage evidence.**
- Refunds apply only to third-party sources the employer cannot fake (Greenhouse, Lever, Ashby). A self-hosted careers page going dark counts as **BROKEN**.

**Tests**
- `test_reclaim_requires_outage_evidence`
- `test_attestation_rejected_when_source_answers`
- `test_attestation_not_allowed_before_deadline`
- `test_short_outage_span_cannot_reclaim`
- `test_a_successful_check_resets_outage_evidence`
- `test_verified_third_party_outage_refunds_employer`
- `test_self_hosted_outage_is_the_employers_fault`

## 2. `check_pledge()` returned KEPT for a closed posting without knowing *when* it closed

**Fix:** KEPT now requires **a consensus observation of the closed posting at or before the deadline**. The `closed_seen_ts` value is stored. A posting first seen closed after the deadline settles as **BROKEN** (`CLOSURE_NOT_PROVEN_BY_DEADLINE`), so closing an overdue posting just before someone checks no longer works.

**Tests**
- `test_late_closure_cannot_avoid_penalty`
- `test_late_closure_checked_by_employer_burns_everything`
- `test_closure_proven_before_deadline_keeps_pledge_and_credits_refund`

**Live:** Pledge #1 was closed and proven closed before its deadline: KEPT, `CLOSURE_PROVEN_BEFORE_DEADLINE` ([tx](https://explorer-bradbury.genlayer.com/tx/0x5a2bbab2e02c3c9f693680cbe9462e3518732f77c070dd1eb50efcc15b4d306f), 5/5 AGREE, FINALIZED).

## 3. `mark_filled()` could change the commitment on an unverified claim

**Fix:** marking a role filled can only **tighten** the deadline: `deadline = min(original deadline, filled + 14 pledge-days)`. An unverified statement can no longer weaken the commitment, so it needs no verification.

**Tests**
- `test_mark_filled_can_only_tighten_the_deadline`
- `test_mark_filled_early_shortens_deadline`

## 4. `register_applicant()` let one person farm applicant rewards, including through employer wallets

**Fix**
- **Registration:** applicants must stake GEN (max(0.001 GEN, bond/50)), and the stake is returned on settlement. Receipt hashes are unique per pledge. Registration closes at the deadline. The employer cannot register.
- **Payout caps:** applicants share **at most 40%** of a broken bond, with **at most 5% per applicant**. The enforcer gets 10%, and the employer can never collect it.
- **Burn:** the remainder (**≥ 50%**) is **burned** to `0x…dEaD`.

Even an employer who registers sybil wallets and enforces their own broken pledge loses at least half the bond. Fully sybil-proof applicant identity (for example zk-email proof of an ATS confirmation) is on the roadmap.

**Tests**
- `test_applicant_registration_rules`
- `test_registration_closes_at_deadline`
- `test_employer_sybil_farm_still_loses_half_the_bond`
- `test_single_applicant_capped_at_5_percent`
- `test_late_closure_checked_by_employer_burns_everything`

## 5. Validator comparison should keep decision-critical source fingerprints, especially for prose salaries

**Fix**
- **Content fingerprint:** every observation carries `content_sha256` (title, locations, structured pay, normalised description). Validators must match it exactly; a conflicting page version means no verdict.
- **Prose salary:** the LLM must return a **verbatim quote** that is present in the fetched description, and both numbers must appear literally in that quote. Code re-parses them, and `quote_sha256` is stored. Validators require exact agreement on the resulting terms (the old ±2% tolerance is removed).

**Tests**
- `test_validator_rejects_conflicting_source_version`
- `test_validator_rejects_different_prose_range`
- `test_prose_range_without_verbatim_quote_is_discarded`
- `test_prose_range_numbers_must_appear_in_quote`
- `test_facts_carry_source_fingerprint`

## 6. `_pay()` recorded payouts before confirming delivery

**Fix:** pull payments.
- Settlement **credits** balances (`get_owed`), and recipients call `withdraw()`.
- `withdraw()` zeroes the balance before emitting the transfer and logs a `Withdrawal`.
- Only the burn is pushed.
- `get_accounting()` publishes contract balance vs. owed + locked + burned, plus a `solvent` flag.

**Tests**
- `test_withdraw_pulls_credit_once`
- `test_broken_pledge_pays_many_recipients_and_accounting_balances` (every wei is credited or burned)

**Live (all transactions FINALIZED, balances read from the chain):**

| Wallet | Credited | Withdraw tx | Balance before → after | Net change (after gas) |
|---|---|---|---|---|
| Employer `0x2d5C…6991` | 0.1 refund (pledge #1 KEPT) | [0xd738…](https://explorer-bradbury.genlayer.com/tx/0xd738398a9d28db5a13f91fdd5e1c4f92e469ca8a2d64ada5b896add04c9e44be) | 4.482821 → 4.580333 | **+0.097513** |
| Applicant 1 `0x431A…75A9` | 0.005 comp + 0.002 stake | [0xb811…](https://explorer-bradbury.genlayer.com/tx/0xb81177d1a324f9e247d0fcab82ef79c97c76f111409ea60116d0eed25b5b9a39) | 0.047142 → 0.054013 | **+0.006871** |
| Applicant 2 `0x9591…cc89` | 0.005 comp + 0.002 stake | [0x9d05…](https://explorer-bradbury.genlayer.com/tx/0x9d0594aeace48e81a41ad163aad79c9b0c50b185be438a4914abce24e191e627) | 0.027849 → 0.034726 | **+0.006877** |
| Enforcer `0x48E1…79BB` | 0.01 reward | [0x5144…](https://explorer-bradbury.genlayer.com/tx/0x51441b06edd2bae10bc5b6665098d54ba69cdc4e4adbe230f88ab26c27f84814) | 0.029628 → 0.039392 | **+0.009764** |
| Burn `0x…dEaD` | 0.08 burned at settlement | (in the check tx) | n/a | +0.08 |

**Final read-back:** `get_accounting()` = `{balance: 0, owed: 0, locked: 0, burned: 0.08 GEN, solvent: true}`.
- In: 0.204 GEN (2 bonds + 2 stakes).
- Out: 0.1 refund + 0.014 to applicants + 0.01 to the enforcer + 0.08 burned = 0.204 GEN.

## 7. Full pledge lifecycle, end to end on Bradbury

| # | Step | Result | Tx |
|---|---|---|---|
| 1 | Employer `create_pledge` ×2, 0.1 GEN bond each, on the demo careers pages | PENDING_PROOF | [#2 create](https://explorer-bradbury.genlayer.com/tx/0x9e90f24f09bd0f3938755c75d8d2862dfb349c85cb3ec070a0aee17f8479436c) |
| 2 | `activate_pledge(1)`: validators find `realrole-1-2d5cbf75` on the posting | ACTIVE, 5/5 | [0xbb54…](https://explorer-bradbury.genlayer.com/tx/0xbb5413f6e287cc7f58caf0931ad0ea303667717f3a97e0af82922a29764ecadb) |
| 3 | `activate_pledge(1)` again | rejected `NOT_PENDING` (guard works) | [0x8d9e…](https://explorer-bradbury.genlayer.com/tx/0x8d9e859fcfb8f4b9bb580d36af3398211e041a4b8987c49b27cbab690bac449c) |
| 4 | `activate_pledge(2)` | ACTIVE | [0xb403…](https://explorer-bradbury.genlayer.com/tx/0xb40317071820c5d22cf1172703eec8235560d87958dcec362c7f48b78e5c6e12) |
| 5 | Two applicants `register_applicant(2)` with 0.002 GEN stake | 5/5 each | [0x55c6…](https://explorer-bradbury.genlayer.com/tx/0x55c635af9be181d4c78825e2d50cf2a3997aa75b6f489393f53071e15713e688), [0x6d3d…](https://explorer-bradbury.genlayer.com/tx/0x6d3d4fa6cc24b65e5e6bd190fc5d6f65c246f7d8ce46af2c602da253ff7f9674) |
| 6 | `check_pledge(2)` before the deadline | `STILL_HONEST` (no settlement) | [0x3d5d…](https://explorer-bradbury.genlayer.com/tx/0x3d5d60b6c30cf5e327fdc609ded727a0f344cf5374b79c6ed0ebe655d1da782f) |
| 7 | `withdraw()` with nothing owed | rejected `NOTHING_OWED` (guard works) | [0x4392…](https://explorer-bradbury.genlayer.com/tx/0x4392a241f7e5fccce94210ad269a121b30b4db75c4eb4c67d468ca97135575ca) |
| 8 | `check_pledge(2)` after the deadline, posting still live | **BROKEN `LINGERED_PAST_DEADLINE`** | [0x191e…](https://explorer-bradbury.genlayer.com/tx/0x191e064638e1c3ca0a1449a419ecf659c5a88d758e8237ae182f2dfc031061a9) |
| 9 | Demo posting closed (page stops publishing JobPosting); `check_pledge(1)` before the deadline | **KEPT `CLOSURE_PROVEN_BEFORE_DEADLINE`**, 5/5 | [0x5a2b…](https://explorer-bradbury.genlayer.com/tx/0x5a2bbab2e02c3c9f693680cbe9462e3518732f77c070dd1eb50efcc15b4d306f) |
| 10 | Four `withdraw()` calls | GEN delivered (table above) | see §6 |

All of these transactions show `FINALIZED` on Bradbury.

The frontend exposes the same lifecycle: the Pledges tab shows the withdraw/claimable panel, staked applicant registration, outage attestation and the solvency read-out. Contract-level steps use `scripts/evidence.mjs`.

## Also fixed while doing this

- **Bradbury write reverts:** genlayer-js signed writes with a too-tight `eth_estimateGas` result, and they reverted after the consensus contract's inner call ran out of gas. This affected every write, including MetaMask audits on the live site. Estimates are now raised to max(3×, 3M) at the RPC layer (`scripts/gasmargin.mjs`, `frontend/lib/genlayer/gasMargin.ts`). Unused gas is refunded.
- **Contract address:** now versioned in code (`frontend/lib/genlayer/client.ts`) rather than in a hidden environment variable.

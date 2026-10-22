"""Layer 2: the Real Role Pledge. Each steward-requested scenario has a named test."""

import pytest

from tests.direct.conftest import GEN, LLM_PATTERN, greenhouse_job, jsonld_page, llm, to_hex

GH = r"boards-api\.greenhouse\.io/v1/boards/acme/jobs/111"
BOND = GEN // 10
STAKE = BOND // 50
BURN = "0x000000000000000000000000000000000000dEaD"
H = ["%064x" % (i + 1) for i in range(8)]
T_ACTIVE = "2026-10-01T12:00:00Z"  # activation time (fixture T0)
BEFORE_DEADLINE = "2026-10-20T12:00:00Z"  # deadline is T0 + 30 days = 2026-10-31
AFTER_DEADLINE = "2026-11-02T12:00:00Z"


def _live(vm, *, code="", pay=(150000, 180000, "Annual Salary:")):
    vm.clear_mocks()
    vm.mock_web(GH, {"status": 200, "body": greenhouse_job(pay=pay, content=f"Great role. {code}")})
    vm.mock_llm(LLM_PATTERN, llm(["US-NYC"]))


def _closed(vm):
    vm.clear_mocks()
    vm.mock_web(GH, {"status": 404, "body": "{}"})


def _down(vm, status=503):
    vm.clear_mocks()
    vm.mock_web(GH, {"status": status, "body": "unavailable"})


def _payouts(rr, pid):
    out = {}
    for x in rr.get_payouts(pid):
        k = (x["to"], x["reason"])
        out[k] = out.get(k, 0) + int(x["amount"])
    return out


@pytest.fixture
def active(direct_vm, rr, direct_alice):
    """An ACTIVE pledge (id 1) by alice: 0.1 GEN bond, 30-day window."""
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    _live(direct_vm, code=rr.get_pledge(pid)["code"])
    assert rr.activate_pledge(pid) == "ACTIVE"
    return pid


def _register(vm, rr, pid, who, h):
    vm.sender = who
    vm.value = STAKE
    rr.register_applicant(pid, h)
    vm.value = 0


# ------------------------------------------------------------ creation


def test_create_pledge_validates_bond_and_window(direct_vm, rr):
    direct_vm.value = 10**15
    with direct_vm.expect_revert("BOND_TOO_SMALL"):
        rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = BOND
    with direct_vm.expect_revert("INVALID_WINDOW"):
        rr.create_pledge("greenhouse", "acme", "111", 3)
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    p = rr.get_pledge(pid)
    assert p["status"] == "PENDING_PROOF"
    assert p["applicant_stake"] == str(STAKE)
    assert rr.get_accounting()["locked"] == str(BOND)


def test_activation_requires_code_and_honest_range(direct_vm, rr):
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    _live(direct_vm, code="")
    assert rr.activate_pledge(pid) == "REJECTED_CODE_NOT_FOUND"
    _live(direct_vm, code=rr.get_pledge(pid)["code"], pay=None)
    assert rr.activate_pledge(pid) == "REJECTED_MISSING_RANGE"
    assert rr.get_pledge(pid)["status"] == "PENDING_PROOF"


def test_second_pledge_on_same_posting_is_rejected(direct_vm, rr, active):
    direct_vm.value = BOND
    with direct_vm.expect_revert("POSTING_ALREADY_PLEDGED"):
        rr.create_pledge("greenhouse", "acme", "111", 30)


# ------------------------------------------------ kept: closure proven in time


def test_closure_proven_before_deadline_keeps_pledge_and_credits_refund(direct_vm, rr, active, direct_alice, direct_charlie):
    direct_vm.warp(BEFORE_DEADLINE)
    _closed(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "CLOSURE_PROVEN_BEFORE_DEADLINE"
    p = rr.get_pledge(active)
    assert p["status"] == "KEPT" and p["closed_seen_ts"] > 0
    assert _payouts(rr, active) == {(to_hex(direct_alice), "BOND_RETURNED"): BOND}
    assert rr.get_owed(to_hex(direct_alice)) == str(BOND)


# ---------------------------------------------- steward: late posting closure


def test_late_closure_cannot_avoid_penalty(direct_vm, rr, active, direct_alice, direct_charlie):
    """Employer leaves the role up past the deadline, closes it, then checks: BROKEN."""
    direct_vm.warp(AFTER_DEADLINE)
    _closed(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "CLOSURE_NOT_PROVEN_BY_DEADLINE"
    assert rr.get_pledge(active)["status"] == "BROKEN"
    pay = _payouts(rr, active)
    assert (to_hex(direct_alice), "BOND_RETURNED") not in pay
    assert pay[(BURN, "BURNED")] == BOND - BOND // 10


def test_late_closure_checked_by_employer_burns_everything(direct_vm, rr, active, direct_alice):
    direct_vm.warp(AFTER_DEADLINE)
    _closed(direct_vm)
    direct_vm.sender = direct_alice  # the employer cannot collect the enforcer reward
    assert rr.check_pledge(active) == "CLOSURE_NOT_PROVEN_BY_DEADLINE"
    assert _payouts(rr, active) == {(BURN, "BURNED"): BOND}
    assert rr.get_accounting()["burned"] == str(BOND)


def test_lingering_past_deadline_breaks_pledge(direct_vm, rr, active, direct_charlie):
    direct_vm.warp(AFTER_DEADLINE)
    _live(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "LINGERED_PAST_DEADLINE"


def test_removing_pay_range_breaks_pledge(direct_vm, rr, active, direct_charlie):
    direct_vm.warp(BEFORE_DEADLINE)
    _live(direct_vm, pay=None)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "PAY_TERMS_BROKEN_MISSING_RANGE"


def test_still_open_within_window_is_honest(direct_vm, rr, active):
    direct_vm.warp(BEFORE_DEADLINE)
    _live(direct_vm)
    assert rr.check_pledge(active) == "STILL_HONEST"
    assert rr.get_pledge(active)["last_live_ts"] > 0


def test_checks_respect_cooldown(direct_vm, rr, active):
    _live(direct_vm)
    with direct_vm.expect_revert("RECENTLY_CHECKED"):
        rr.check_pledge(active)


# ------------------------------------------ steward: unverified mark_filled


def test_mark_filled_can_only_tighten_the_deadline(direct_vm, rr, active, direct_alice, direct_bob):
    deadline = rr.get_pledge(active)["deadline_ts"]
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("ONLY_EMPLOYER"):
        rr.mark_filled(active)
    # Filled 25 days in: 25 + 14 > 30, so the original deadline stays.
    direct_vm.warp("2026-10-26T12:00:00Z")
    direct_vm.sender = direct_alice
    rr.mark_filled(active)
    assert rr.get_pledge(active)["deadline_ts"] == deadline


def test_mark_filled_early_shortens_deadline(direct_vm, rr, active, direct_alice, direct_charlie):
    direct_vm.warp("2026-10-02T12:00:00Z")
    rr.mark_filled(active)
    p = rr.get_pledge(active)
    assert p["deadline_ts"] < p["activated_ts"] + 30 * 86400
    # 15 days later the role is still up: broken under the tightened deadline.
    direct_vm.warp("2026-10-17T12:00:00Z")
    _live(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "OPEN_AFTER_FILLED_DEADLINE"


# --------------------------------------- steward: unauthorized bond recovery


def test_reclaim_requires_outage_evidence(direct_vm, rr, active, direct_alice):
    direct_vm.warp("2026-12-30T12:00:00Z")
    with direct_vm.expect_revert("NOT_ENOUGH_EVIDENCE"):
        rr.reclaim_unverifiable(active)


def test_attestation_rejected_when_source_answers(direct_vm, rr, active, direct_charlie):
    direct_vm.warp(AFTER_DEADLINE)
    _live(direct_vm)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("SOURCE_REACHABLE_USE_CHECK"):
        rr.attest_unavailable(active)
    _closed(direct_vm)  # a 404 is an answer (closed), not an outage
    with direct_vm.expect_revert("SOURCE_REACHABLE_USE_CHECK"):
        rr.attest_unavailable(active)


def test_attestation_not_allowed_before_deadline(direct_vm, rr, active):
    direct_vm.warp(BEFORE_DEADLINE)
    _down(direct_vm)
    with direct_vm.expect_revert("BEFORE_DEADLINE"):
        rr.attest_unavailable(active)


def test_short_outage_span_cannot_reclaim(direct_vm, rr, active):
    _down(direct_vm)
    for t in ("2026-11-02T12:00:00Z", "2026-11-02T13:00:00Z", "2026-11-02T14:00:00Z"):
        direct_vm.warp(t)
        rr.attest_unavailable(active)
    with direct_vm.expect_revert("EVIDENCE_SPAN_TOO_SHORT"):
        rr.reclaim_unverifiable(active)


def test_a_successful_check_resets_outage_evidence(direct_vm, rr, active, direct_charlie):
    _down(direct_vm)
    direct_vm.warp("2026-11-02T12:00:00Z")
    rr.attest_unavailable(active)
    direct_vm.warp("2026-11-03T12:00:00Z")
    rr.attest_unavailable(active)
    direct_vm.warp("2026-11-04T12:00:00Z")
    _live(direct_vm)  # the source is back and the role is still up
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "LINGERED_PAST_DEADLINE"


def test_verified_third_party_outage_refunds_employer(direct_vm, rr, active, direct_alice):
    _down(direct_vm, 503)
    for t in ("2026-11-02T12:00:00Z", "2026-11-03T12:00:00Z", "2026-11-04T13:00:00Z"):
        direct_vm.warp(t)
        assert rr.attest_unavailable(active) == "HTTP_5XX"
    assert rr.reclaim_unverifiable(active) == "THIRD_PARTY_SOURCE_UNAVAILABLE"
    p = rr.get_pledge(active)
    assert p["status"] == "UNVERIFIABLE" and p["unavailable_count"] == 3
    assert "UNAVAILABLE" in p["evidence"]
    assert _payouts(rr, active) == {(to_hex(direct_alice), "BOND_RECLAIMED"): BOND}


def test_self_hosted_outage_is_the_employers_fault(direct_vm, rr, direct_alice, direct_charlie):
    url = "https://careers.example.org/jobs/solidity"
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    pid = rr.create_pledge("jsonld", "", url, 30)
    direct_vm.value = 0
    code = rr.get_pledge(pid)["code"]
    direct_vm.mock_web(r"careers\.example\.org", {"status": 200, "body": jsonld_page(description=f"Join us. {code}")})
    direct_vm.mock_llm(LLM_PATTERN, llm(["US-CO"]))
    assert rr.activate_pledge(pid) == "ACTIVE"
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"careers\.example\.org", {"status": 500, "body": "down"})
    direct_vm.sender = direct_charlie
    for t in ("2026-11-02T12:00:00Z", "2026-11-03T12:00:00Z", "2026-11-04T13:00:00Z"):
        direct_vm.warp(t)
        rr.attest_unavailable(pid)
    assert rr.reclaim_unverifiable(pid) == "SELF_HOSTED_SOURCE_UNAVAILABLE"
    assert rr.get_pledge(pid)["status"] == "BROKEN"


# -------------------------- steward: manipulated / employer-controlled applicants


def test_applicant_registration_rules(direct_vm, rr, active, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    direct_vm.value = STAKE
    with direct_vm.expect_revert("EMPLOYER_CANNOT_APPLY"):
        rr.register_applicant(active, H[0])
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    with direct_vm.expect_revert("WRONG_STAKE"):
        rr.register_applicant(active, H[0])
    direct_vm.value = STAKE
    with direct_vm.expect_revert("INVALID_RECEIPT_HASH"):
        rr.register_applicant(active, "not-a-hash")
    rr.register_applicant(active, H[0])
    with direct_vm.expect_revert("ALREADY_REGISTERED"):
        rr.register_applicant(active, H[1])
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("RECEIPT_ALREADY_USED"):
        rr.register_applicant(active, H[0])
    assert rr.is_applicant(active, to_hex(direct_bob)) is True


def test_registration_closes_at_deadline(direct_vm, rr, active, direct_bob):
    direct_vm.warp(AFTER_DEADLINE)
    direct_vm.sender = direct_bob
    direct_vm.value = STAKE
    with direct_vm.expect_revert("REGISTRATION_CLOSED"):
        rr.register_applicant(active, H[0])


def test_employer_sybil_farm_still_loses_half_the_bond(direct_vm, rr, active, direct_accounts):
    """Employer registers 7 wallets they control, breaks the pledge and enforces it."""
    sybils = direct_accounts[3:10]
    assert len(sybils) == 7
    for i, w in enumerate(sybils):
        _register(direct_vm, rr, active, w, H[i])
    direct_vm.warp(AFTER_DEADLINE)
    _live(direct_vm)
    direct_vm.sender = sybils[0]  # a sybil collects the enforcer reward too
    rr.check_pledge(active)
    pay = _payouts(rr, active)
    to_sybils = sum(v for (to, reason), v in pay.items() if reason in ("APPLICANT_COMPENSATION", "ENFORCER_REWARD"))
    assert to_sybils <= BOND // 2
    assert pay[(BURN, "BURNED")] >= BOND // 2
    # Stakes are returned, so the farm gains nothing beyond the capped pool.
    assert sum(v for (to, reason), v in pay.items() if reason == "STAKE_RETURNED") == STAKE * 7


def test_single_applicant_capped_at_5_percent(direct_vm, rr, active, direct_bob, direct_charlie):
    _register(direct_vm, rr, active, direct_bob, H[0])
    direct_vm.warp(AFTER_DEADLINE)
    _live(direct_vm)
    direct_vm.sender = direct_charlie
    rr.check_pledge(active)
    pay = _payouts(rr, active)
    assert pay[(to_hex(direct_bob), "APPLICANT_COMPENSATION")] == BOND * 5 // 100
    assert pay[(to_hex(direct_charlie), "ENFORCER_REWARD")] == BOND // 10
    assert pay[(BURN, "BURNED")] == BOND - BOND * 5 // 100 - BOND // 10


# ------------------------------------------- steward: multi-recipient payouts


def test_broken_pledge_pays_many_recipients_and_accounting_balances(direct_vm, rr, active, direct_accounts, direct_charlie):
    people = direct_accounts[3:6]
    for i, w in enumerate(people):
        _register(direct_vm, rr, active, w, H[i])
    assert rr.get_accounting()["locked"] == str(BOND + 3 * STAKE)
    direct_vm.warp(BEFORE_DEADLINE)
    _live(direct_vm, pay=None)
    direct_vm.sender = direct_charlie
    rr.check_pledge(active)
    pay = _payouts(rr, active)
    pool_share = min(BOND * 40 // 100 // 3, BOND * 5 // 100)
    for w in people:
        assert pay[(to_hex(w), "APPLICANT_COMPENSATION")] == pool_share
        assert pay[(to_hex(w), "STAKE_RETURNED")] == STAKE
        assert rr.get_owed(to_hex(w)) == str(pool_share + STAKE)
    total = sum(pay.values())
    assert total == BOND + 3 * STAKE  # every wei is credited or burned, nothing lost
    acct = rr.get_accounting()
    assert acct["locked"] == "0"
    assert int(acct["owed"]) + int(acct["burned"]) == BOND + 3 * STAKE


# ------------------------------------------------------------ withdrawals


def test_withdraw_pulls_credit_once(direct_vm, rr, active, direct_alice, direct_bob):
    direct_vm.warp(BEFORE_DEADLINE)
    _closed(direct_vm)
    rr.check_pledge(active)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("NOTHING_OWED"):
        rr.withdraw()
    direct_vm.sender = direct_alice
    assert rr.withdraw() == BOND
    assert rr.get_owed(to_hex(direct_alice)) == "0"
    assert rr.get_withdrawals(to_hex(direct_alice))[0]["amount"] == str(BOND)
    with direct_vm.expect_revert("NOTHING_OWED"):
        rr.withdraw()
    assert rr.get_accounting()["owed"] == "0"


def test_withdraw_pending_refunds_employer_only(direct_vm, rr, direct_alice, direct_bob):
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("ONLY_EMPLOYER"):
        rr.withdraw_pending(pid)
    direct_vm.sender = direct_alice
    rr.withdraw_pending(pid)
    assert rr.get_pledge(pid)["status"] == "WITHDRAWN"
    assert rr.get_owed(to_hex(direct_alice)) == str(BOND)


def test_settled_pledge_cannot_be_checked_again(direct_vm, rr, active):
    direct_vm.warp(BEFORE_DEADLINE)
    _closed(direct_vm)
    rr.check_pledge(active)
    with direct_vm.expect_revert("NOT_CHECKABLE"):
        rr.check_pledge(active)


def test_listing_views(rr, active):
    assert [p["id"] for p in rr.get_pledges(0, 10)] == [active]
    assert rr.get_recent_audits(5)[0]["trigger"] == "activation"
    assert rr.get_stats()["day_s"] == 86400

"""Layer 2: the Real Role Pledge lifecycle and its payouts."""

import pytest

from tests.direct.conftest import GEN, LLM_PATTERN, greenhouse_job, llm, to_hex

GH = r"boards-api\.greenhouse\.io/v1/boards/acme/jobs/111"
BOND = GEN // 10
H1 = "a" * 64
H2 = "0x" + "b" * 64


def _live(vm, *, code="", pay=(150000, 180000, "Annual Salary:")):
    vm.clear_mocks()
    vm.mock_web(GH, {"status": 200, "body": greenhouse_job(pay=pay, content=f"Great role. {code}")})
    vm.mock_llm(LLM_PATTERN, llm(["US-NYC"]))


def _closed(vm):
    vm.clear_mocks()
    vm.mock_web(GH, {"status": 404, "body": "{}"})


@pytest.fixture
def active(direct_vm, rr, direct_alice):
    """An ACTIVE pledge (id 1) by alice with a 30-day window."""
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    code = rr.get_pledge(pid)["code"]
    _live(direct_vm, code=code)
    assert rr.activate_pledge(pid) == "ACTIVE"
    return pid


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
    assert p["bond"] == str(BOND)
    assert p["code"].startswith(f"realrole-{pid}-")


def test_activation_requires_code_in_posting(direct_vm, rr):
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    _live(direct_vm, code="")
    assert rr.activate_pledge(pid) == "REJECTED_CODE_NOT_FOUND"
    assert rr.get_pledge(pid)["status"] == "PENDING_PROOF"


def test_activation_requires_compliant_range(direct_vm, rr):
    direct_vm.value = BOND
    pid = rr.create_pledge("greenhouse", "acme", "111", 30)
    direct_vm.value = 0
    _live(direct_vm, code=rr.get_pledge(pid)["code"], pay=None)
    assert rr.activate_pledge(pid) == "REJECTED_MISSING_RANGE"


def test_activation_sets_deadline_and_links_posting(rr, active):
    p = rr.get_pledge(active)
    assert p["status"] == "ACTIVE"
    assert p["deadline_ts"] - p["activated_ts"] == 30 * 86400
    assert rr.get_posting("greenhouse", "acme", "111")["pledge_id"] == active


def test_second_pledge_on_same_posting_cannot_activate(direct_vm, rr, active):
    direct_vm.value = BOND
    with direct_vm.expect_revert("POSTING_ALREADY_PLEDGED"):
        rr.create_pledge("greenhouse", "acme", "111", 30)


def test_applicant_registration_rules(direct_vm, rr, active, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("EMPLOYER_CANNOT_APPLY"):
        rr.register_applicant(active, H1)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("INVALID_RECEIPT_HASH"):
        rr.register_applicant(active, "not-a-hash")
    rr.register_applicant(active, H1)
    with direct_vm.expect_revert("ALREADY_REGISTERED"):
        rr.register_applicant(active, H1)
    assert rr.is_applicant(active, to_hex(direct_bob)) is True
    assert rr.get_pledge(active)["applicant_count"] == 1


def test_checks_respect_cooldown(direct_vm, rr, active):
    _live(direct_vm)
    with direct_vm.expect_revert("RECENTLY_CHECKED"):
        rr.check_pledge(active)


def test_posting_closed_in_window_keeps_pledge_and_returns_bond(direct_vm, rr, active, direct_alice, direct_charlie):
    direct_vm.warp("2026-10-05T12:00:00Z")
    _closed(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "CLOSED_IN_WINDOW"
    p = rr.get_pledge(active)
    assert p["status"] == "KEPT"
    assert rr.get_payouts(active) == [{
        "pledge_id": active, "to": to_hex(direct_alice), "amount": str(BOND),
        "reason": "BOND_RETURNED", "ts": p["settled_ts"],
    }]
    [card] = rr.get_scorecards()
    assert card["PLEDGES_KEPT"] == 1
    assert rr.get_posting("greenhouse", "acme", "111")["pledge_id"] == 0


def test_still_open_within_window_is_honest(direct_vm, rr, active):
    direct_vm.warp("2026-10-05T12:00:00Z")
    _live(direct_vm)
    assert rr.check_pledge(active) == "STILL_HONEST"
    assert rr.get_pledge(active)["status"] == "ACTIVE"


def test_removing_pay_range_breaks_pledge_and_pays_applicants(direct_vm, rr, active, direct_bob, direct_charlie, direct_accounts):
    dave = direct_accounts[3]
    for who, h in ((direct_bob, H1), (dave, H2)):
        direct_vm.sender = who
        rr.register_applicant(active, h)

    direct_vm.warp("2026-10-05T12:00:00Z")
    _live(direct_vm, pay=None)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "PAY_TERMS_BROKEN_MISSING_RANGE"
    assert rr.get_pledge(active)["status"] == "BROKEN"
    assert rr.get_pledge(active)["enforcer"] == to_hex(direct_charlie)

    payouts = {(x["to"], x["reason"]): int(x["amount"]) for x in rr.get_payouts(active)}
    share = (BOND - BOND // 10) // 2
    assert payouts[(to_hex(direct_bob), "APPLICANT_COMPENSATION")] == share
    assert payouts[(to_hex(dave), "APPLICANT_COMPENSATION")] == share
    assert payouts[(to_hex(direct_charlie), "ENFORCER_REWARD")] == BOND - 2 * share
    assert sum(payouts.values()) == BOND


def test_lingering_past_deadline_breaks_pledge(direct_vm, rr, active, direct_charlie):
    direct_vm.warp("2026-11-15T12:00:00Z")
    _live(direct_vm)
    direct_vm.sender = direct_charlie
    assert rr.check_pledge(active) == "LINGERED_PAST_DEADLINE"
    [payout] = rr.get_payouts(active)
    assert payout["reason"] == "ENFORCER_REWARD" and int(payout["amount"]) == BOND


def test_filled_role_must_close_within_grace(direct_vm, rr, active, direct_alice, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("ONLY_EMPLOYER"):
        rr.mark_filled(active)
    direct_vm.sender = direct_alice
    rr.mark_filled(active)
    assert rr.get_pledge(active)["status"] == "FILLED_PENDING_CLOSE"
    with direct_vm.expect_revert("NOT_ACTIVE"):
        rr.register_applicant(active, H1)

    direct_vm.warp("2026-10-20T12:00:00Z")
    _live(direct_vm)
    direct_vm.sender = direct_bob
    assert rr.check_pledge(active) == "ZOMBIE_AFTER_FILL"


def test_filled_role_that_closes_is_kept(direct_vm, rr, active, direct_alice):
    rr.mark_filled(active)
    direct_vm.warp("2026-10-08T12:00:00Z")
    _closed(direct_vm)
    assert rr.check_pledge(active) == "CLOSED_AFTER_FILL"
    assert rr.get_pledge(active)["status"] == "KEPT"


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
    assert rr.get_payouts(pid)[0]["reason"] == "BOND_WITHDRAWN"


def test_reclaim_only_after_long_silence(direct_vm, rr, active, direct_alice):
    with direct_vm.expect_revert("TOO_EARLY"):
        rr.reclaim_unverifiable(active)
    direct_vm.warp("2026-12-15T12:00:00Z")
    rr.reclaim_unverifiable(active)
    p = rr.get_pledge(active)
    assert p["status"] == "UNVERIFIABLE"
    assert rr.get_payouts(active)[0]["reason"] == "BOND_RECLAIMED"


def test_settled_pledge_cannot_be_checked_again(direct_vm, rr, active):
    direct_vm.warp("2026-10-05T12:00:00Z")
    _closed(direct_vm)
    rr.check_pledge(active)
    with direct_vm.expect_revert("NOT_CHECKABLE"):
        rr.check_pledge(active)


def test_listing_views(rr, active):
    assert [p["id"] for p in rr.get_pledges(0, 10)] == [active]
    assert rr.get_postings(0, 10)[0]["key"] == "greenhouse:acme:111"
    assert rr.get_recent_audits(5)[0]["trigger"] == "activation"
    assert rr.get_stats()["pledges"] == 1

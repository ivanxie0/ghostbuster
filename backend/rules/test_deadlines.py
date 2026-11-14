"""Run: make test. Owner: Hardik — add cases as rules get verified."""
from datetime import date, datetime, timezone

from app.models import Provider, Search
from rules.deadlines import business_days_between, check_violation


def _search(**kw):
    base = dict(id="s", insurer="X", plan_type="hmo", zip="92103", specialty="therapist",
                appointment_type="new", created_at=datetime.now(timezone.utc), status="verifying")
    return Search(**{**base, **kw})


def test_weekend_skipped():
    # Fri 2026-11-13 -> Mon 2026-11-16 = 1 business day
    assert business_days_between(date(2026, 11, 13), date(2026, 11, 16)) == 1


def test_thanksgiving_skipped():
    # Wed 11/25 -> Mon 11/30: Thu+Fri are holidays -> 1 business day (Mon)
    assert business_days_between(date(2026, 11, 25), date(2026, 11, 30)) == 1


def test_same_or_past_is_zero():
    assert business_days_between(date(2026, 11, 16), date(2026, 11, 16)) == 0
    assert business_days_between(date(2026, 11, 16), date(2026, 11, 10)) == 0


def test_violation_and_available():
    p = Provider(name="T", specialty="therapist", earliest_date=date(2026, 12, 23))
    out = check_violation(p, _search(), asked_on=date(2026, 11, 14))
    assert out.violation and out.ghost_status == "violation" and out.deadline_days == 10

    p2 = Provider(name="T", specialty="therapist", earliest_date=date(2026, 11, 18))
    out2 = check_violation(p2, _search(), asked_on=date(2026, 11, 14))
    assert not out2.violation and out2.ghost_status == "available" and out2.business_days_wait == 3


def test_no_date_is_no_answer():
    out = check_violation(Provider(name="T", specialty="therapist"), _search())
    assert out.ghost_status == "no_answer"

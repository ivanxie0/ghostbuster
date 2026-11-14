"""Run: make test. Owner: Hardik — add cases as rules get verified."""
from datetime import date, datetime

from app.models import Provider, Search
from rules.deadlines import TZ, business_days_between, check_violation

# Sat 2026-11-14 2:00 PM Pacific
ASKED = datetime(2026, 11, 14, 14, 0, tzinfo=TZ)


def _search(**kw):
    base = dict(id="s", insurer="X", plan_type="hmo", zip="92103", specialty="therapist",
                appointment_type="new", created_at=ASKED, status="verifying")
    return Search(**{**base, **kw})


def _p(d=None):
    return Provider(name="T", specialty="therapist", earliest_date=d)


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
    out = check_violation(_p(date(2026, 12, 23)), _search())
    assert out.violation and out.ghost_status == "violation" and out.deadline_days == 10
    out2 = check_violation(_p(date(2026, 11, 18)), _search())
    assert not out2.violation and out2.ghost_status == "available" and out2.business_days_wait == 3


def test_no_date_is_no_answer():
    out = check_violation(_p(), _search())
    assert out.ghost_status == "no_answer"


def test_urgent_uses_calendar_hours_not_business_days():
    s = _search(appointment_type="urgent")
    # Mon 11/16 00:00 is 34h after Sat 2pm -> within 48h (even though it's a weekend in between)
    assert check_violation(_p(date(2026, 11, 16)), s).ghost_status == "available"
    # Tue 11/17 00:00 is 58h -> violation at 48h, but fine with prior auth (96h)
    assert check_violation(_p(date(2026, 11, 17)), s).violation
    assert not check_violation(_p(date(2026, 11, 17)), s, prior_auth=True).violation
    # Thu 11/19 00:00 is 106h -> violation even with prior auth
    assert check_violation(_p(date(2026, 11, 19)), s, prior_auth=True).violation


def test_therapist_follow_up_counts_from_prior_appointment():
    # Prior appt Mon 11/2; +10 business days = Mon 11/16 (11/11 is a holiday -> Tue 11/17)
    s = _search(appointment_type="follow_up", prior_appointment_date=date(2026, 11, 2))
    assert check_violation(_p(date(2026, 11, 17)), s).ghost_status == "available"
    assert check_violation(_p(date(2026, 11, 18)), s).ghost_status == "violation"
    # Without a prior date, the clock starts at the request -> 11/18 is only 3 business days
    s2 = _search(appointment_type="follow_up")
    assert check_violation(_p(date(2026, 11, 18)), s2).ghost_status == "available"

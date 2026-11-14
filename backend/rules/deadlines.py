"""Step 4: legal deadlines + business-day math. Owner: Hardik. Numbers verified by Jai (docs/RULES.md).

Contract:
  DEADLINES[specialty][appointment_type] -> deadline in business days
  business_days_between(start, end) -> int
  check_violation(provider, search, asked_on=None) -> Provider (copy with ghost_status/violation/etc set)
"""
from datetime import date, timedelta

from app.models import Provider, Search

# UNVERIFIED — Jai is checking against DMHC. Keep in sync with docs/RULES.md.
DEADLINES: dict[str, dict[str, int]] = {
    "primary_care": {"new": 10, "follow_up": 10, "urgent": 2},
    "specialist":   {"new": 15, "follow_up": 15, "urgent": 2},
    "psychiatrist": {"new": 15, "follow_up": 15, "urgent": 2},
    # SB 221: follow-up is 10 business days from the PRIOR appointment. TODO(Hardik): needs prior date input.
    "therapist":    {"new": 10, "follow_up": 10, "urgent": 2},
}
# Urgent rules are in hours. "urgent" above = 48h (no prior auth) approximated as 2 business days.
URGENT_HOURS = {"no_prior_auth": 48, "prior_auth": 96}

# Federal + California state holidays (observed dates). TODO(Jai): confirm CA list.
HOLIDAYS: set[date] = {
    # 2026
    date(2026, 1, 1), date(2026, 1, 19), date(2026, 2, 12), date(2026, 2, 16), date(2026, 3, 31),
    date(2026, 5, 25), date(2026, 6, 19), date(2026, 7, 3), date(2026, 9, 7), date(2026, 9, 25),
    date(2026, 10, 12), date(2026, 11, 11), date(2026, 11, 26), date(2026, 11, 27), date(2026, 12, 25),
    # 2027
    date(2027, 1, 1), date(2027, 1, 18), date(2027, 2, 12), date(2027, 2, 15), date(2027, 3, 31),
    date(2027, 5, 31), date(2027, 6, 18), date(2027, 7, 5), date(2027, 9, 6), date(2027, 9, 24),
    date(2027, 10, 11), date(2027, 11, 11), date(2027, 11, 25), date(2027, 11, 26), date(2027, 12, 24),
    date(2027, 12, 31),
}


def is_business_day(d: date) -> bool:
    return d.weekday() < 5 and d not in HOLIDAYS


def business_days_between(start: date, end: date) -> int:
    """Business days after `start` up to and including `end`. 0 if end <= start."""
    n, d = 0, start
    while d < end:
        d += timedelta(days=1)
        if is_business_day(d):
            n += 1
    return n


def deadline_for(specialty: str, appointment_type: str) -> int:
    return DEADLINES[specialty][appointment_type]


def check_violation(provider: Provider, search: Search, asked_on: date | None = None) -> Provider:
    """Given a provider whose call result (earliest_date / call_transcript) is filled in, set
    business_days_wait, deadline_days, violation, ghost_status (available|violation|no_answer), ghost_reason.

    TODO(Hardik): follow_up should measure from the prior appointment date; urgent should use hours.
    """
    asked_on = asked_on or date.today()
    deadline = deadline_for(search.specialty, search.appointment_type)
    if provider.earliest_date is None:
        return provider.model_copy(update={
            "ghost_status": "no_answer", "deadline_days": deadline, "violation": False,
            "business_days_wait": None, "ghost_reason": "No answer / no usable appointment date",
        })
    wait = business_days_between(asked_on, provider.earliest_date)
    violation = wait > deadline
    reason = (f"Earliest opening is {wait} business days out (deadline {deadline})" if violation
              else f"Earliest opening is {wait} business days out — within the {deadline}-day deadline")
    return provider.model_copy(update={
        "business_days_wait": wait, "deadline_days": deadline, "violation": violation,
        "ghost_status": "violation" if violation else "available", "ghost_reason": reason,
    })

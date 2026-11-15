"""Step 4: legal deadlines + business-day / hour math. Owner: Hardik. Numbers verified by Jai (docs/RULES.md).

Contract:
  DEADLINES[specialty][appointment_type] -> deadline in business days (new / follow_up)
  URGENT_HOURS["no_prior_auth" | "prior_auth"] -> deadline in calendar hours (urgent)
  business_days_between(start, end) -> int
  check_violation(provider, search, asked_at=None, prior_auth=False) -> Provider (copy with
      ghost_status / violation / business_days_wait / deadline_days / ghost_reason set)

Request time = search.created_at (converted to Pacific time) unless asked_at is passed.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.models import Provider, Search

TZ = ZoneInfo("America/Los_Angeles")

# VERIFIED 2026-11-14 (Jai) against HSC §1367.03(a)(5) / 28 CCR §1300.67.2.2(c)(5). Keep in sync with docs/RULES.md.
# Non-therapist follow_up has NO separate statutory deadline (a)(5)(I); we reuse the request-based number
# but word it as "past the standard", never a confirmed violation (see check_violation).
DEADLINES: dict[str, dict[str, int]] = {
    "primary_care": {"new": 10, "follow_up": 10},
    "specialist":   {"new": 15, "follow_up": 15},
    "psychiatrist": {"new": 15, "follow_up": 15},
    # SB 221: therapist follow-up is 10 business days from the PRIOR appointment (search.prior_appointment_date).
    "therapist":    {"new": 10, "follow_up": 10},
}
# Urgent: calendar hours from request time to the appointment (NOT business days).
URGENT_HOURS = {"no_prior_auth": 48, "prior_auth": 96}

# Federal + California state holidays (observed dates). Verified by Jai vs CalHR + Gov Code §6700.
# Deliberately broad: more holidays = fewer business days counted = we only flag when clearly late.
HOLIDAYS: set[date] = {
    # 2026
    date(2026, 1, 1), date(2026, 1, 19), date(2026, 2, 12), date(2026, 2, 16), date(2026, 3, 31),
    date(2026, 5, 25), date(2026, 6, 19), date(2026, 7, 3), date(2026, 9, 7), date(2026, 9, 25),
    date(2026, 10, 12), date(2026, 11, 11), date(2026, 11, 26), date(2026, 11, 27), date(2026, 12, 25),
    # 2027
    date(2027, 1, 1), date(2027, 1, 18), date(2027, 2, 12), date(2027, 2, 15), date(2027, 3, 31),
    date(2027, 5, 31), date(2027, 6, 18), date(2027, 7, 5), date(2027, 9, 6), date(2027, 9, 9), date(2027, 9, 24),
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


def hours_until(asked_at: datetime, appt_date: date) -> float:
    """Calendar hours from request time to the START of the appointment day (Pacific).
    Start-of-day is the conservative choice: we only flag a violation when it's clearly late.
    TODO(Hardik): use the exact appointment time if the transcript gives one."""
    appt = datetime.combine(appt_date, time(0, 0), TZ)
    return max(0.0, (appt - asked_at.astimezone(TZ)).total_seconds() / 3600)


def clock_start(search: Search, asked_at: datetime) -> date:
    """Day the business-day clock starts: prior appointment for therapist follow-ups (if given), else request day."""
    if search.specialty == "therapist" and search.appointment_type == "follow_up" and search.prior_appointment_date:
        return search.prior_appointment_date
    return asked_at.astimezone(TZ).date()


def check_violation(provider: Provider, search: Search, asked_at: datetime | None = None,
                    prior_auth: bool = False) -> Provider:
    """Given a provider whose call result (earliest_date / call_transcript) is filled in, decide
    available / violation / no_answer against the legal deadline."""
    asked_at = asked_at or search.created_at
    urgent = search.appointment_type == "urgent"
    limit_h = URGENT_HOURS["prior_auth" if prior_auth else "no_prior_auth"]
    # Urgent rows store the hour limit as calendar days (48h -> 2) in deadline_days; see DATA_CONTRACT.md.
    deadline = limit_h // 24 if urgent else DEADLINES[search.specialty][search.appointment_type]

    if provider.earliest_date is None:
        # calls/webhook.py appends "Result: not accepting ..." when the office said so (status stays no_answer).
        said_no = "\nResult: not accepting" in (provider.call_transcript or "")
        return provider.model_copy(update={
            "ghost_status": "no_answer", "deadline_days": deadline, "violation": False,
            "business_days_wait": None,
            "ghost_reason": ("Called: listed, but not accepting new patients with this plan" if said_no
                             else "No answer / no usable appointment date"),
        })

    start = clock_start(search, asked_at)
    wait = business_days_between(start, provider.earliest_date)
    if urgent:
        hours = hours_until(asked_at, provider.earliest_date)
        violation = hours > limit_h
        reason = (f"Urgent: earliest opening is ~{hours:.0f} hours out (deadline {limit_h} hours)"
                  if violation else f"Urgent: ~{hours:.0f} hours out — within the {limit_h}-hour deadline")
    else:
        violation = wait > deadline
        since = "prior appointment" if start == search.prior_appointment_date and search.specialty == "therapist" else "request"
        # (a)(5)(I): only therapist follow-up has its own deadline; others are measured as a requested appointment.
        soft = search.appointment_type == "follow_up" and search.specialty != "therapist"
        if not violation:
            reason = f"Earliest opening is {wait} business days after {since} — within the {deadline}-day deadline"
        elif soft:
            reason = (f"Earliest opening is {wait} business days after request — past the {deadline}-day standard "
                      f"for a requested appointment (follow-up timing set by your provider can be exempt)")
        else:
            reason = f"Earliest opening is {wait} business days after {since} (deadline {deadline})"
    return provider.model_copy(update={
        "business_days_wait": wait, "deadline_days": deadline, "violation": violation,
        "ghost_status": "violation" if violation else "available", "ghost_reason": reason,
    })

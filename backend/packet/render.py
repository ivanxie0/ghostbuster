"""Step 5 (Ending B): printable Timely Access Grievance packet (evidence log + grievance letter + next steps). Owner: Aryan (code), Jai (template text in ./templates).

Contract: render_packet(search_id) -> HTML string (US Letter, print -> PDF).
Templates are plain text with {placeholders}: insurer, plan_type, plan_label, zip, specialty, specialty_label,
appointment_type (readable, e.g. "follow-up"), appointment_label ("follow-up appointment"),
a_appointment_label ("an urgent appointment"), deadline_text ("10 business days" / "48 hours"), deadline_days, today, n_listed, n_called,
n_violations, n_ghosts, n_no_answer, search_id. Unknown placeholders render as "____".
"""
import html
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

from app import store
from rules.deadlines import DEADLINES, TZ, URGENT_HOURS

TEMPLATES = Path(__file__).parent / "templates"
PLAN = {"hmo": "HMO", "ppo": "PPO", "medi_cal": "Medi-Cal", "unknown": "plan type unknown"}
SPEC = {"therapist": "therapist", "psychiatrist": "psychiatrist", "primary_care": "primary care provider", "specialist": "specialist"}
APPT = {"new": "new-patient", "follow_up": "follow-up", "urgent": "urgent"}
APPT_LABEL = {k: f"{v} appointment" for k, v in APPT.items()}  # "follow-up appointment"
A_APPT_LABEL = {k: ("an " if v[0] in "aeiou" else "a ") + v for k, v in APPT_LABEL.items()}  # "an urgent appointment"


# Windows-safe dates: no dash-flag strftime codes (glibc/BSD only). Build day and hour numbers by hand.
def long_date(d) -> str:
    return f"{d:%B} {d.day}, {d.year}"


def short_date(d) -> str:
    return f"{d:%b} {d.day}, {d.year}"


def short_datetime(dt) -> str:
    return f"{short_date(dt)} {dt.hour % 12 or 12}:{dt:%M} {dt:%p} {dt:%Z}".rstrip()
CALLED_GHOST_LABEL = "Listed, but not accepting this plan/new patients"
LABEL = {"available": "Available in time", "violation": "Past legal deadline", "no_answer": "No answer",
         "ghost": "Appears unavailable", "unverified": "Not called", "calling": "Call in progress"}

CSS = """
@page { size: letter; margin: 0.6in; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 32px;
       font-size: 12.5px; line-height: 1.45; background: #fff; }
@media print { body { padding: 0; } .pb { break-before: page; } tr, .card, .tx { break-inside: avoid; } }
h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #111; }
h3 { font-size: 13px; margin: 14px 0 4px; }
.muted { color: #555; } .small { font-size: 11px; }
.notice { border: 2px solid #b45309; background: #fffbeb; padding: 8px 12px; border-radius: 6px; margin-bottom: 18px; }
.meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
.card { border: 1px solid #ccc; border-radius: 6px; padding: 8px 10px; }
.card b { display: block; font-size: 20px; } .card.red b { color: #b91c1c; }
table { border-collapse: collapse; width: 100%; font-size: 11.5px; }
th, td { border: 1px solid #cfcfcf; padding: 5px 6px; text-align: left; vertical-align: top; }
th { background: #f1f1f1; }
.pill { display: inline-block; padding: 1px 7px; border-radius: 999px; font-weight: 700; font-size: 10.5px; white-space: nowrap; }
.violation { background: #fee2e2; color: #991b1b; } .available { background: #dcfce7; color: #166534; }
.no_answer { background: #fef3c7; color: #92400e; } .ghost { background: #e5e7eb; color: #374151; }
.unverified, .calling { background: #e0f2fe; color: #075985; }
pre { white-space: pre-wrap; font-family: Georgia, "Times New Roman", serif; font-size: 13px; line-height: 1.55;
      border: 1px solid #ddd; padding: 16px 18px; border-radius: 6px; margin: 0; }
.tx { border-left: 3px solid #999; padding: 4px 10px; margin: 8px 0; }
.tx p { margin: 2px 0; } .tx .who { font-weight: 700; }
.demo { border: 2px dashed #a16207; background: #fef9c3; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; }
.finding { font-size: 15px; font-weight: 700; margin: 10px 0; }
.steps { border: 2px solid #111; border-radius: 6px; padding: 4px 14px; } .steps li { margin: 6px 0; }
"""


def _tpl(name: str, ctx: dict) -> str:
    path = TEMPLATES / name
    text = path.read_text() if path.exists() else f"[missing template {name}]"
    return html.escape(text.format_map(defaultdict(lambda: "____", ctx)))


# Display-only phone masking: "(•••) •••-4529". The packet never prints a full phone number.
_PHONE_IN_TEXT = re.compile(r"(?<![\w/])(?:\+1\d{10}|(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4})(?!\d)")


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    return f"(•••) •••-{digits[-4:]}" if len(digits) >= 4 else "•••"


def mask_phones_in(text: str | None) -> str:
    """Mask formatted phone numbers inside free text. Bare 10-digit IDs (NPI numbers in URLs) are left alone."""
    return _PHONE_IN_TEXT.sub(lambda m: mask_phone(m.group(0)), text or "")


def _flag_source(p) -> str:
    """Where a ghost flag came from: the profile URL at the end of the reason ("... (https://...)"), else source_url."""
    m = re.search(r"\((https?://[^\s)]+)\)\s*$", p.ghost_reason or "")
    return m.group(1) if m else (p.source_url or "")


def _e(v) -> str:
    return html.escape("" if v is None else str(v))


def render_packet(search_id: str) -> str:
    detail = store.get(search_id)
    if not detail:
        return "<h1>Search not found</h1>"
    s, providers = detail.search, detail.providers
    # A called row can end as ghost ("not accepting new patients / this plan", Hardik). Keep it in the call
    # log so its transcript stays in the evidence; it counts as an office that could not offer a timely appt.
    called = [p for p in providers
              if p.ghost_status in ("available", "violation", "no_answer") or (p.ghost_status == "ghost" and p.call_transcript)]
    ghosts = [p for p in providers if p.ghost_status == "ghost"]
    urgent = s.appointment_type == "urgent"
    deadline_days = URGENT_HOURS["no_prior_auth"] // 24 if urgent else DEADLINES[s.specialty][s.appointment_type]
    deadline_text = f"{URGENT_HOURS['no_prior_auth']} hours" if urgent else f"{deadline_days} business days"
    since = (f" from the prior appointment on {s.prior_appointment_date}"
             if s.specialty == "therapist" and s.appointment_type == "follow_up" and s.prior_appointment_date else "")
    ctx = {
        **s.model_dump(), "plan_label": PLAN[s.plan_type], "specialty_label": SPEC[s.specialty],
        # Never let templates print raw enum values like "follow_up".
        "appointment_type": APPT[s.appointment_type], "appointment_label": APPT_LABEL[s.appointment_type],
        "a_appointment_label": A_APPT_LABEL[s.appointment_type],
        "today": long_date(date.today()), "deadline_days": deadline_days, "deadline_text": deadline_text,
        "n_listed": len(providers), "n_called": len(called), "n_violations": sum(p.violation for p in called),
        "n_ghosts": len(ghosts), "n_no_answer": sum(p.ghost_status == "no_answer" for p in called), "search_id": s.id,
    }

    def wait(p) -> str:
        if p.business_days_wait is None:
            return "—"
        return "<1 bus. day" if p.business_days_wait == 0 else f"{p.business_days_wait} bus. day{'' if p.business_days_wait == 1 else 's'}"

    log_rows = "".join(
        f"<tr><td><b>{_e(p.name)}</b><br><span class='muted small'>{_e(p.address)}</span></td><td>{_e(mask_phone(p.phone))}</td>"
        f"<td>{short_datetime(p.checked_at.astimezone(TZ)) if p.checked_at else ''}</td>"
        f"<td><span class='pill {p.ghost_status}'>{CALLED_GHOST_LABEL if p.ghost_status == 'ghost' else LABEL[p.ghost_status]}</span></td>"
        f"<td>{short_date(p.earliest_date) if p.earliest_date else '—'}</td><td>{wait(p)}</td>"
        f"<td>{_e(mask_phones_in(p.ghost_reason))}</td></tr>"
        for p in called
    ) or "<tr><td colspan='7' class='muted'>No offices were called.</td></tr>"
    ghost_rows = "".join(
        f"<tr><td><b>{_e(p.name)}</b></td><td>{_e(mask_phone(p.phone))}</td><td>{_e(mask_phones_in(p.ghost_reason))}</td>"
        f"<td class='small'>{_e(_flag_source(p))}"
        f"{'<br><span class=muted>checked ' + short_date(p.checked_at.astimezone(TZ)) + '</span>' if p.checked_at and p.source_url else ''}</td></tr>"
        for p in ghosts
    ) or "<tr><td colspan='4' class='muted'>None.</td></tr>"
    transcripts = "".join(
        f"<div class='tx'><h3>{_e(p.name)}{' — ' + _e(mask_phone(p.phone)) if p.phone else ''}</h3>"
        + "".join(
            f"<p><span class='who'>{_e(line.split(':', 1)[0])}:</span>{_e(line.split(':', 1)[1]) if ':' in line else ''}</p>"
            for line in mask_phones_in(p.call_transcript or "(no transcript)").splitlines()
            if re.sub(r"^(Agent|Office):\s*", "", line).strip()  # skip empty turns
        )
        + "</div>"
        for p in called
    )

    demo = any((p.source_url or "").startswith("https://example.com/") for p in providers)
    all_demo = demo and all((p.source_url or "").startswith("https://example.com/") for p in providers)
    demo_banner = (
        "<div class='demo'><b>DEMO DATA — fictional providers.</b> "
        + ("Every provider in this packet is" if all_demo else "Providers with example.com sources are")
        + " made up for a hackathon demonstration. They are not real offices and no real listing is being labeled.</div>"
    ) if demo else ""
    any_available = any(p.ghost_status == "available" for p in called)
    finding = ("At least one provider we reached offered a timely appointment." if any_available
               else "No provider we reached could offer a timely appointment." if called
               else "No offices were reached.")

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Timely Access Grievance — {_e(s.insurer)}</title><style>{CSS}</style></head><body>
<div class="notice"><b>Evidence log + template — not legal advice.</b> Review and fill in the blanks before sending. In crisis? Call or text <b>988</b>.</div>
{demo_banner}
<h1>Timely Access Grievance</h1>
<div class="muted">{_e(s.insurer)} · {ctx['plan_label']} · {ctx['specialty_label']} ({APPT[s.appointment_type]}) · ZIP {_e(s.zip)} ·
generated {ctx['today']} · ref {s.id[:8]}</div>
<p>Calls were placed on {ctx['today']}, with the enrollee&#39;s permission, by an AI assistant acting as the
<b>enrollee&#39;s authorized representative</b>. The assistant identified itself as an AI calling on behalf of a patient.</p>
<div class="meta">
  <div class="card"><span class="muted small">Listed in directory</span><b>{ctx['n_listed']}</b></div>
  <div class="card"><span class="muted small">Listings that appear unavailable</span><b>{ctx['n_ghosts']}</b></div>
  <div class="card"><span class="muted small">Offices reached</span><b>{ctx['n_called']}</b></div>
  <div class="card red"><span class="muted small">Past legal deadline</span><b>{ctx['n_violations']}</b></div>
</div>
<p class="finding">{finding}</p>
<p><b>Standard:</b> California Health and Safety Code §1367.03(a)(5) — {A_APPT_LABEL[s.appointment_type]} with a {ctx['specialty_label']}
within <b>{deadline_text}</b>{_e(since)}. Business days exclude weekends and federal/California holidays.
A provider can lawfully set a longer wait if they note in the enrollee&#39;s record that it won&#39;t harm the enrollee&#39;s health.
Telehealth appointments count.</p>

<h2>Part 1 — Evidence log</h2>
<h3>Calls to listed providers</h3>
<p class="small muted">Each office was asked for the earliest available appointment with this plan, in person or by telehealth.
"Past legal deadline" describes one office&#39;s answer; the legal duty to offer a timely appointment is the plan&#39;s.</p>
<table><tr><th>Provider</th><th>Phone</th><th>Called</th><th>Result</th><th>Earliest</th><th>Wait</th><th>Notes</th></tr>{log_rows}</table>
<h3>Directory listings that appear unavailable</h3>
<table><tr><th>Provider</th><th>Listed phone</th><th>Why flagged</th><th>Source</th></tr>{ghost_rows}</table>

<h2 class="pb">Part 2 — Grievance letter to {_e(s.insurer)}</h2><pre>{_tpl('letter.txt', ctx)}</pre>

<h2 class="pb">Next steps</h2>
<div class="steps"><ol>
  <li><b>File the grievance.</b> Send the letter above the way your plan accepts grievances, and call member services with the script below. Keep copies and write down dates.</li>
  <li><b>The plan has 30 days to respond</b> to a standard grievance, or 3 days if your case is urgent.</li>
  <li><b>Urgent? Go straight to the DMHC.</b> If waiting is a serious threat to your health, you don&#39;t have to wait the 30 days.</li>
  <li><b>DMHC Help Center</b> (free): 1-888-466-2219 · www.dmhc.ca.gov/FileaComplaint.aspx — attach this packet when you file.</li>
</ol></div>
<h3>Member services phone script</h3><pre>{_tpl('script.txt', ctx)}</pre>
<h3>Taking it to the DMHC</h3><pre>{_tpl('dmhc.txt', ctx)}</pre>

<h2 class="pb">Appendix: call transcripts</h2>{transcripts or "<p class='muted'>No transcripts.</p>"}
<p class="small muted" style="margin-top:24px">Generated by GhostBuster. This document is an evidence log and a template,
not legal advice. Verify all details before submitting.{" Contains fictional demo data." if demo else ""}</p>
</body></html>"""

"""Step 5 (Ending B): printable evidence packet. Owner: Aryan (code), Jai (template text in ./templates).

Contract: render_packet(search_id) -> HTML string (US Letter, print -> PDF).
Templates are plain text with {placeholders}: insurer, plan_type, plan_label, zip, specialty, specialty_label,
appointment_type, deadline_text ("10 business days" / "48 hours"), deadline_days, today, n_listed, n_called,
n_violations, n_ghosts, n_no_answer, search_id. Unknown placeholders render as "____".
"""
import html
from collections import defaultdict
from datetime import date
from pathlib import Path

from app import store
from rules.deadlines import DEADLINES, TZ, URGENT_HOURS

TEMPLATES = Path(__file__).parent / "templates"
PLAN = {"hmo": "HMO", "ppo": "PPO", "medi_cal": "Medi-Cal", "unknown": "plan type unknown"}
SPEC = {"therapist": "therapist", "psychiatrist": "psychiatrist", "primary_care": "primary care", "specialist": "specialist"}
APPT = {"new": "new-patient", "follow_up": "follow-up", "urgent": "urgent"}
LABEL = {"available": "Available in time", "violation": "Past legal deadline", "no_answer": "No answer",
         "ghost": "Ghost listing", "unverified": "Not called", "calling": "Call in progress"}

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
"""


def _tpl(name: str, ctx: dict) -> str:
    path = TEMPLATES / name
    text = path.read_text() if path.exists() else f"[missing template {name}]"
    return html.escape(text.format_map(defaultdict(lambda: "____", ctx)))


def _e(v) -> str:
    return html.escape("" if v is None else str(v))


def render_packet(search_id: str) -> str:
    detail = store.get(search_id)
    if not detail:
        return "<h1>Search not found</h1>"
    s, providers = detail.search, detail.providers
    called = [p for p in providers if p.ghost_status in ("available", "violation", "no_answer")]
    ghosts = [p for p in providers if p.ghost_status == "ghost"]
    urgent = s.appointment_type == "urgent"
    deadline_days = URGENT_HOURS["no_prior_auth"] // 24 if urgent else DEADLINES[s.specialty][s.appointment_type]
    deadline_text = f"{URGENT_HOURS['no_prior_auth']} hours" if urgent else f"{deadline_days} business days"
    since = (f" from the prior appointment on {s.prior_appointment_date}"
             if s.specialty == "therapist" and s.appointment_type == "follow_up" and s.prior_appointment_date else "")
    ctx = {
        **s.model_dump(), "plan_label": PLAN[s.plan_type], "specialty_label": SPEC[s.specialty],
        "today": date.today().strftime("%B %-d, %Y"), "deadline_days": deadline_days, "deadline_text": deadline_text,
        "n_listed": len(providers), "n_called": len(called), "n_violations": sum(p.violation for p in called),
        "n_ghosts": len(ghosts), "n_no_answer": sum(p.ghost_status == "no_answer" for p in called), "search_id": s.id,
    }

    def wait(p) -> str:
        if p.business_days_wait is None:
            return "—"
        return f"{p.business_days_wait} bus. days"

    log_rows = "".join(
        f"<tr><td><b>{_e(p.name)}</b><br><span class='muted small'>{_e(p.address)}</span></td><td>{_e(p.phone)}</td>"
        f"<td>{p.checked_at.astimezone(TZ).strftime('%b %-d, %Y %-I:%M %p %Z') if p.checked_at else ''}</td>"
        f"<td><span class='pill {p.ghost_status}'>{LABEL[p.ghost_status]}</span></td>"
        f"<td>{p.earliest_date.strftime('%b %-d, %Y') if p.earliest_date else '—'}</td><td>{wait(p)}</td>"
        f"<td>{_e(p.ghost_reason)}</td></tr>"
        for p in called
    ) or "<tr><td colspan='7' class='muted'>No offices were called.</td></tr>"
    ghost_rows = "".join(
        f"<tr><td><b>{_e(p.name)}</b></td><td>{_e(p.phone)}</td><td>{_e(p.ghost_reason)}</td>"
        f"<td class='small'>{_e(p.source_url)}</td></tr>"
        for p in ghosts
    ) or "<tr><td colspan='4' class='muted'>None.</td></tr>"
    transcripts = "".join(
        f"<div class='tx'><h3>{_e(p.name)} — {_e(p.phone)}</h3>"
        + "".join(
            f"<p><span class='who'>{_e(line.split(':', 1)[0])}:</span>{_e(line.split(':', 1)[1]) if ':' in line else ''}</p>"
            for line in (p.call_transcript or "(no transcript)").splitlines()
        )
        + "</div>"
        for p in called
    )

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Timely access evidence packet — {_e(s.insurer)}</title><style>{CSS}</style></head><body>
<div class="notice"><b>Evidence log + templates — not legal advice.</b> Review before sending. In crisis? Call or text <b>988</b>.</div>
<h1>Timely Access Evidence Packet</h1>
<div class="muted">{_e(s.insurer)} · {ctx['plan_label']} · {ctx['specialty_label']} ({APPT[s.appointment_type]}) · ZIP {_e(s.zip)} ·
generated {ctx['today']} · ref {s.id[:8]}</div>
<div class="meta">
  <div class="card"><span class="muted small">Listed in directory</span><b>{ctx['n_listed']}</b></div>
  <div class="card"><span class="muted small">Ghost listings</span><b>{ctx['n_ghosts']}</b></div>
  <div class="card"><span class="muted small">Offices contacted</span><b>{ctx['n_called']}</b></div>
  <div class="card red"><span class="muted small">Past the legal deadline</span><b>{ctx['n_violations']}</b></div>
</div>
<p><b>Standard applied:</b> California timely access — {ctx['specialty_label']} {APPT[s.appointment_type]} appointment within
<b>{deadline_text}</b>{_e(since)}. Business days exclude weekends and federal/California holidays.</p>

<h2>1. Call log</h2>
<p class="small muted">Each office was called by an AI assistant that identified itself as an AI calling on behalf of a patient
and asked for the earliest new-patient opening with this plan.</p>
<table><tr><th>Provider</th><th>Phone</th><th>Called</th><th>Result</th><th>Earliest</th><th>Wait</th><th>Notes</th></tr>{log_rows}</table>

<h2>2. Directory listings that appear to be ghosts</h2>
<table><tr><th>Provider</th><th>Listed phone</th><th>Why flagged</th><th>Source</th></tr>{ghost_rows}</table>

<h2 class="pb">3. Letter to {_e(s.insurer)}</h2><pre>{_tpl('letter.txt', ctx)}</pre>
<h2>4. Member services phone script</h2><pre>{_tpl('script.txt', ctx)}</pre>
<h2>5. If the plan doesn't fix it: DMHC</h2><pre>{_tpl('dmhc.txt', ctx)}</pre>

<h2 class="pb">Appendix: call transcripts</h2>{transcripts or "<p class='muted'>No transcripts.</p>"}
<p class="small muted" style="margin-top:24px">Generated by GhostBuster. This document is an evidence log and set of templates,
not legal advice. Verify all details before submitting.</p>
</body></html>"""

"""Step 5 (Ending B): printable evidence packet. Owner: Aryan (code), Jai (template text in ./templates).

Contract: render_packet(search_id) -> HTML string. Browser Print -> PDF.
Templates are plain text with {placeholders}: insurer, plan_type, zip, specialty, appointment_type,
deadline_days, today, n_called, n_violations, n_ghosts.
"""
import html
from collections import defaultdict
from datetime import date
from pathlib import Path

from app import store

TEMPLATES = Path(__file__).parent / "templates"


def _tpl(name: str, ctx: dict) -> str:
    text = (TEMPLATES / name).read_text()
    return html.escape(text.format_map(defaultdict(lambda: "____", ctx)))


def render_packet(search_id: str) -> str:
    """TODO(Aryan): nicer layout. TODO(Jai): real template text in templates/*.txt."""
    detail = store.get(search_id)
    if not detail:
        return "<h1>Search not found</h1>"
    s, providers = detail.search, detail.providers
    called = [p for p in providers if p.ghost_status in ("available", "violation", "no_answer")]
    ctx = {
        **s.model_dump(), "today": date.today().isoformat(),
        "deadline_days": next((p.deadline_days for p in called if p.deadline_days), "____"),
        "n_called": len(called), "n_violations": sum(p.violation for p in called),
        "n_ghosts": sum(p.ghost_status == "ghost" for p in providers),
    }
    rows = "".join(
        f"<tr><td>{html.escape(p.name)}</td><td>{html.escape(p.phone or '')}</td><td>{p.ghost_status}</td>"
        f"<td>{p.earliest_date or ''}</td><td>{p.business_days_wait if p.business_days_wait is not None else ''}</td>"
        f"<td>{p.deadline_days or ''}</td><td>{html.escape(p.ghost_reason or '')}</td>"
        f"<td>{p.checked_at.strftime('%Y-%m-%d %H:%M UTC') if p.checked_at else ''}</td></tr>"
        for p in providers
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>GhostBuster evidence packet</title>
<style>body{{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#111}}
table{{border-collapse:collapse;width:100%;font-size:13px}}td,th{{border:1px solid #ccc;padding:4px;text-align:left}}
pre{{white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:1rem}}
.notice{{border:2px solid #b45309;padding:.75rem;background:#fffbeb}}</style></head><body>
<p class="notice"><b>Evidence log + template, not legal advice.</b> In crisis? Call or text <b>988</b>.</p>
<h1>Timely access evidence packet</h1>
<p>{html.escape(s.insurer)} · {s.plan_type} · {s.specialty} · {s.appointment_type} · ZIP {s.zip} · generated {ctx['today']}</p>
<h2>1. Call log</h2>
<table><tr><th>Provider</th><th>Phone</th><th>Result</th><th>Earliest</th><th>Business days</th><th>Deadline</th><th>Notes</th><th>Checked</th></tr>{rows}</table>
<h2>2. Letter to insurer</h2><pre>{_tpl('letter.txt', ctx)}</pre>
<h2>3. Member services call script</h2><pre>{_tpl('script.txt', ctx)}</pre>
<h2>4. DMHC complaint info</h2><pre>{_tpl('dmhc.txt', ctx)}</pre>
</body></html>"""

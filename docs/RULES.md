# Timely access rules

> ## ⚠️ UNVERIFIED — Jai is checking against official DMHC sources
> Code lives in `backend/rules/deadlines.py` (Hardik). When Jai confirms/changes a number, update
> both this file and `DEADLINES` in that module, and link the source below.

Applies to state-regulated (DMHC) plans: most HMOs and Medi-Cal managed care. Self-funded employer
plans (often PPO) are federally regulated (ERISA) and may **not** be covered — the app warns for
`ppo` and `unknown`.

| Key (`specialty` / `appointment_type`) | Deadline | Notes |
|---|---|---|
| `primary_care` / `new` | 10 business days | |
| `specialist` / `new` | 15 business days | physician specialists |
| `psychiatrist` / `new` | 15 business days | |
| `therapist` / `new` | 10 business days | non-physician mental health |
| `therapist` / `follow_up` | 10 business days **from prior appointment** | SB 221. App currently measures from request date — TODO |
| any / `urgent` | 48 hours | urgent, no prior authorization required |
| (any / urgent with prior auth) | 96 hours | not exposed in UI yet |
| `primary_care`/`specialist`/`psychiatrist` / `follow_up` | same as `new` (ASSUMPTION) | Jai: confirm |

**Business days** exclude Saturdays, Sundays, and federal + California state holidays
(list hardcoded for 2026–2027 in `deadlines.py` — Jai: confirm CA list).

## Sources (Jai to fill)
- [ ] DMHC timely access page:
- [ ] 28 CCR § 1300.67.2.2:
- [ ] SB 221 (2021) text:
- [ ] DMHC complaint / IMR info for packet:

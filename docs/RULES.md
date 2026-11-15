# Timely access rules

> ## ✅ Deadlines VERIFIED 2026-11-14 (Jai) against the statute and regulation text
> Read directly from the official sources listed at the bottom. Code lives in `backend/rules/deadlines.py`
> (Hardik). **No deadline number in `DEADLINES` / `URGENT_HOURS` needs to change.** The things that do
> need attention are in "Open items for the team" below. This is an evidence tool, not legal advice.

## Who the rules apply to
Health care service plans licensed by the DMHC under the Knox-Keene Act: HMOs, the DMHC-licensed PPO
products, most Covered California plans, and Medi-Cal managed care plans (§1367.03(k)). They do **not**
apply to self-funded employer (ERISA) plans or Medicare. The app warns for `ppo` and `unknown` because
that is where self-funded plans usually hide.

### Coverage warning for the app (3 sentences, verified 2026-11-14)
Show on the search form, always for `ppo` and `unknown`, and as a short note for everyone:

> **Who this covers:** California's appointment deadlines apply to state-regulated coverage: plans
> licensed by the Department of Managed Health Care (most HMOs, many PPOs, most Covered California
> plans, Medi-Cal managed care) and health insurance policies regulated by the California Department of
> Insurance. They do **not** apply to self-funded employer or union plans, which are under federal law
> even if an insurer's name is on your card, or to Medicare. Not sure which you have? Ask HR or member
> services "Is my plan self-funded?" before relying on these deadlines.

Shorter version for a tooltip or badge: "Covers state-regulated California plans. Self-funded employer
plans and Medicare are not covered. Ask HR: 'Is my plan self-funded?'"

Regulator by plan, for the packet and the pitch:

| Coverage | Same deadlines? | Law | Complaints go to |
|---|---|---|---|
| DMHC-licensed plan (most HMOs, many PPOs, most Covered California) | Yes | Health & Safety Code §1367.03 | DMHC Help Center, 1-888-466-2219 |
| Medi-Cal managed care plan | Yes | §1367.03(k) applies it | DMHC Help Center; State Fair Hearing also available |
| Insurance policy regulated by the Dept. of Insurance (some PPO/EPO) | Yes, identical numbers | Insurance Code §10133.54(b)(5) | CDI, 1-800-927-4357 |
| Self-funded employer / union plan (ERISA) | **No** | federal law | U.S. Dept. of Labor, EBSA |
| Medicare / Medicare Advantage | **No** | federal law | Medicare |
| Medi-Cal fee-for-service, county mental health plans | Not under these sections | different rules, not checked | — |

Known gap: the grievance letter cites §1367.03. For a Department of Insurance policy the matching cite
is Insurance Code §10133.54(b)(5). The app cannot tell the two apart from `plan_type`, so the letter's
footer tells the member the rules depend on their plan.

## Deadlines table

All from Health & Safety Code §1367.03(a)(5), mirrored word for word in 28 CCR §1300.67.2.2(c)(5).

| Key (`specialty` / `appointment_type`) | Deadline | Measured from | Cite | Status |
|---|---|---|---|---|
| `primary_care` / `new` | 10 business days | request for appointment | (a)(5)(C) | ✅ verified |
| `specialist` / `new` | 15 business days | request for appointment | (a)(5)(D) | ✅ verified |
| `psychiatrist` / `new` | 15 business days | request for appointment | (a)(5)(D), a psychiatrist is a specialist physician | ✅ verified |
| `therapist` / `new` | 10 business days | request for appointment | (a)(5)(E) "nonphysician mental health care or substance use disorder provider" | ✅ verified |
| `therapist` / `follow_up` | 10 business days | **the prior appointment** | (a)(5)(F), added by SB 221, in force since July 1, 2022 | ✅ verified |
| any / `urgent`, no prior auth | 48 hours | request for appointment | (a)(5)(A) | ✅ verified |
| any / `urgent`, prior auth required | 96 hours | request for appointment | (a)(5)(B) | ✅ verified |
| `primary_care`, `specialist`, `psychiatrist` / `follow_up` | **no separate follow-up deadline exists** | — | (a)(5)(I) | ⚠️ assumption was wrong, see below |

Not in the app but in the same list: ancillary services (labs, imaging, physical therapy) 15 business days, (a)(5)(G).

### Exceptions that apply to every row
- **Provider can extend the wait** — (a)(5)(H). The deadline "may be extended if the referring or treating
  licensed health care provider, or the health professional providing triage or screening services ... has
  determined and noted in the relevant record that a longer waiting time will not have a detrimental
  impact on the health of the enrollee." It must be a clinical decision written in the record. A front
  desk saying "we're booked" is not this exception.
- **Periodic follow-up and preventive care are exempt** — (a)(5)(I). Preventive care and "periodic followup
  care, including standing referrals to specialists for chronic conditions, periodic office visits to
  monitor and treat pregnancy, cardiac, mental health, or substance use disorder conditions" may be
  scheduled in advance as the treating provider decides. This exception is listed for rows C, D, E and G.
  It is **not** listed for the therapist follow-up row (F) or the urgent rows.
- **Member can choose to wait** — (a)(7)(C). The plan may accommodate "an enrollee's preference to wait for
  a later appointment from a specific network provider." Wanting one particular therapist is not a violation.
- **Rescheduling** — (a)(3). A rescheduled appointment must be rebooked promptly and still be consistent
  with these standards.

### Row-specific notes
- **Therapist follow-up (F)** only covers people "undergoing a course of treatment for an ongoing mental
  health or substance use disorder condition." It does not cap care at one visit per 10 business days.
  If `prior_appointment_date` is missing we count from the request date, which is the (E) standard, so the
  fallback is defensible.
- **Non-therapist follow-up.** There is no numeric follow-up standard for primary care, specialists or
  psychiatrists. If the member asks for a non-urgent appointment the normal 10 / 15 days from the request
  still applies, but a follow-up interval chosen by the treating provider is exempt under (I). Keeping
  the same numbers as `new` in code is acceptable, but the result must be worded as "past the standard
  for a requested appointment", never as a confirmed violation.
- **Urgent.** The statute says "hours", not business hours, so calendar hours is the correct reading.
  "Urgent care" means a condition that needs prompt attention (§1367.03(e)(7)). Whether prior
  authorization is required depends on the plan and service; default to 48.

### What "request" and "waiting time" mean
- "Appointment waiting time" is "the time from the initial request for health care services by an enrollee
  or the enrollee's treating provider to the earliest date offered for the appointment" including any
  time spent on plan authorization (§1367.03(e)(2)).
- The regulation adds that the request can be made "to the plan or a provider" by "an enrollee, an
  enrollee's representative or the enrollee's treating provider", and that **a grievance about a delay in
  getting an appointment counts as an initial request** (28 CCR §1300.67.2.2(b)(2)).
- In the app: request time = `searches.created_at` (Pacific). The letter should let the member write in
  an earlier date if they first asked earlier.

### The duty is on the plan, not on each provider
The law requires the **plan's network** to be able to offer an appointment in time (§1367.03(a)(5)). One
office being booked out is not itself a violation by that office. The finding that matters is "none of
the listed providers we reached could offer an appointment within the deadline." When that happens:
- The plan must arrange care outside the network if it is unavailable in network and medically necessary,
  and the member's cost "shall not exceed applicable in-network copayments, coinsurance, and deductibles"
  (§1367.03(a)(7)(C)).
- For mental health and substance use care the plan "shall arrange coverage to ensure the delivery of
  medically necessary out-of-network services" at in-network cost sharing (§1374.72(d)).
  **§1374.72 does not apply to Medi-Cal managed care contracts** (§1374.72(e)), so do not cite it for
  `medi_cal`; cite §1367.03(a)(7)(C) only.

### Telehealth
Neither §1367.03(a)(5) nor the regulation says the appointment must be in person. DMHC's own compliance
survey tells surveyors that "the appointment modality does not matter" and to record the earliest
appointment of either kind (DMHC PAAS Manual, seen via search result only, PDF not opened). So **a
telehealth slot inside the deadline counts as an offer.** The agent should ask for the earliest opening
"in person or by telehealth" and we treat either as the earliest date.

## Business days and holidays
- Business days exclude Saturdays, Sundays and holidays. Exclude the day of the request, include the last
  day (DMHC PAAS Manual, via search result). `business_days_between()` already does this. ✅
- Neither the statute nor the regulation defines "business day" or lists holidays. The hardcoded list is
  a deliberately broad union, which is the conservative choice: more holidays means fewer days counted,
  so we only flag when clearly late.

Checked against the CalHR state holiday list and Government Code §6700:

| Holiday | 2026 | 2027 | In `deadlines.py` | Basis |
|---|---|---|---|---|
| New Year's Day | Jan 1 | Jan 1 | ✅ | CalHR, §6700 |
| Martin Luther King Jr. Day | Jan 19 | Jan 18 | ✅ | CalHR, §6700 |
| Lincoln Day | Feb 12 | Feb 12 | ✅ | §6700 only (not a paid state holiday) |
| Presidents' Day | Feb 16 | Feb 15 | ✅ | CalHR, §6700 |
| Cesar Chavez / Farmworkers Day | Mar 31 | Mar 31 | ✅ | CalHR, §6700 |
| Memorial Day | May 25 | May 31 | ✅ | CalHR, §6700 |
| Juneteenth | Jun 19 | Jun 18 (observed, Jun 19 is a Saturday) | ✅ | §6700, federal |
| Independence Day | Jul 3 (observed, Jul 4 is a Saturday) | Jul 5 (observed, Jul 4 is a Sunday) | ✅ | CalHR, §6700, federal observance |
| Labor Day | Sep 7 | Sep 6 | ✅ | CalHR, §6700 |
| Native American Day | Sep 25 | Sep 24 | ✅ | §6700 only |
| Columbus Day | Oct 12 | Oct 11 | ✅ | §6700, federal |
| Veterans Day | Nov 11 | Nov 11 | ✅ | CalHR, §6700 |
| Thanksgiving | Nov 26 | Nov 25 | ✅ | CalHR |
| Day after Thanksgiving | Nov 27 | Nov 26 | ✅ | CalHR |
| Christmas | Dec 25 | Dec 24 (observed, Dec 25 is a Saturday) | ✅ | CalHR, federal observance |
| New Year's Day 2028 | — | Dec 31 (observed) | ✅ | federal observance |
| Admission Day | Sep 9 | Sep 9 | ❌ optional add | §6700 only |
| Genocide Remembrance Day | Apr 24 | Apr 24 (Saturday) | ❌ optional add | §6700 only |
| Lunar New Year | Feb 17 | Feb 6 (Saturday) | ❌ optional add | §6700 only |
| Diwali | Nov 8 (Sunday) | date not confirmed | ❌ optional add | §6700 only |

**Verdict: every date in the list is correct and every CalHR state holiday is covered.** The four
"optional add" rows are in §6700 but are not days state offices or clinics close. Leaving them out does
not affect any date between now and the demo. The only future weekday among them with a confirmed date
is 2027-09-09.

## Open items for the team
1. **Hardik** — no number changes. Optional: add `date(2027, 9, 9)` to `HOLIDAYS`. Agent prompt should
   ask for the earliest opening "in person or by telehealth". Remove the `UNVERIFIED` comment.
2. **Hardik / Aryan** — non-therapist `follow_up` must not be presented as a confirmed violation
   (see row-specific notes). Easiest fix: only offer `follow_up` in the UI when specialty is `therapist`.
3. **Aryan** — user-facing wording: show "past the legal deadline", not "violation", for a single
   provider. The claim we can support is network-level: nobody we reached could offer a timely
   appointment. The `ghost_status` enum value can stay `violation`.
4. **Everyone** — every result screen needs one line on the (H) exception: "A provider can lawfully set
   a longer wait if they note in your record that it won't harm your health."
5. **Hardik** — calls are transcribed, so the agent's opening line should also say the call is being
   recorded or transcribed. California requires all-party consent to record a confidential call
   (Penal Code §632, not re-read today).

## Sources (official, read 2026-11-14 unless noted)
- [x] Health & Safety Code §1367.03 (amended by Stats. 2026, ch. 27, SB 164, effective June 29, 2026):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1367.03
- [x] 28 CCR §1300.67.2.2 (current through Register 2026, No. 44): search "1300.67.2.2" at
  https://govt.westlaw.com/calregs/
- [x] Health & Safety Code §1374.72 (out-of-network mental health, amended effective Jan 1, 2026):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1374.72
- [x] DMHC Timely Access to Care page (exceptions, phone standards, Help Center 1-888-466-2219):
  https://www.dmhc.ca.gov/HealthCareinCalifornia/YourHealthCareRights/TimelyAccesstoCare.aspx
- [x] DMHC complaint and IMR process (30-day plan grievance first, urgent cases immediately):
  https://www.dmhc.ca.gov/FileaComplaint.aspx
- [x] DMHC complaint FAQ (what qualifies for IMR, who is not eligible):
  https://www.dmhc.ca.gov/FileaComplaint/FrequentlyAskedQuestions.aspx
- [x] Government Code §6700 (state holidays, amended effective March 26, 2026):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=6700
- [x] CalHR state holidays: https://www.calhr.ca.gov/employees/pages/state-holidays/
- [ ] DMHC PAAS Manual (business-day counting, telehealth): quoted from a search result, PDF not opened:
  https://www.dmhc.ca.gov/Portals/0/Docs/OPL/RY%202024%20MY%202023%20PAAS%20Manual.pdf
- [ ] DMHC Timely Access fact sheet PDF (the wait-time table on the DMHC page is an image/PDF, not read):
  https://www.dmhc.ca.gov/Portals/0/Docs/DO/TAC_accessible.pdf
- [ ] SB 221 All Plan Letters (APL 22-007 and later): not opened. The statute text above is controlling.
- [x] Insurance Code §10133.54 (CDI-regulated insurance, same deadlines; amended effective Jan 1, 2023):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=10133.54
- [ ] 10 CCR §2240.15 (CDI regulation): located on Westlaw, text not read.

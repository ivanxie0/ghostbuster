# Demo script (Jai)

Total: 3:00 live demo + 2:00 Q&A. Demo shows the **therapy path**, Ending B (packet).
Wording rule: "past legal deadline" per provider, "no provider we reached could offer a timely
appointment" overall. Never "violation" about one office.

## Roles
| Person | Job on stage |
|---|---|
| **Jai** | Opens (problem + law). Narrates the packet. Takes legal and coverage questions. |
| **Aryan** | Drives the laptop. Only person touching the keyboard. |
| **Hardik** | Holds the demo phone, hands it to the judge, explains the call. Takes voice/AI questions. |
| **Ivan** | Architecture close. Takes data, scraping and scale questions. |

## Setup checklist (before going on stage)
- [ ] Backend and frontend running; decide **real call vs FAKE_MODE** 10 minutes before, not on stage
- [ ] Demo phone = one of `TEAMMATE_PHONE_*`, charged, ringer loud, Do Not Disturb off
- [ ] Browser on `/`, zoomed to 150%, form values ready: Blue Shield of California, HMO, 92103, therapist, new
- [ ] A finished search open in a second tab (fallback if the live run stalls)
- [ ] A packet already open in a third tab
- [ ] Backup: screen recording of one full run, ready to play
- [ ] Card for the judge (text below), printed or on a second phone

**Judge card:** "You are the receptionist at a therapy office. An assistant will call asking for the
earliest new-patient appointment. Answer however you like. For the best demo, say the first opening
is in the middle of January."

## Script

### 0:00–0:30 — Problem + law (Jai)
75 words. Do not add to it.
> "Try finding a therapist who takes your insurance. A study last month made almost six thousand
> calls to listed clinicians. About one in eight led to an appointment. The rest are ghost listings.
>
> California law gives your plan ten business days to get you in, or it must arrange care out of
> network at your in-network price. But you have to prove the network failed, one call at a time.
> GhostBuster makes the calls."

### 0:30–2:15 — Live demo
**0:30–0:50 — Search (Aryan drives, Jai talks)**
> Jai: "I'm a Blue Shield HMO member in San Diego and I need a new therapist."

Aryan submits the form. Results load.
> Jai: "These are licensed therapists near me, from the national provider registry. Bright Data
> checked each one's public profile. These ones, flagged as ghosts, aren't really available: not taking new patients, moved, or a dead number."

**0:50–1:40 — The call (Hardik)**
Hardik hands the phone and the card to a judge.
> Hardik: "With the patient's permission, our AI makes the calls. Today it only dials our own
> phones, so you're the receptionist."

Aryan clicks **Verify**. Phone rings. Judge answers; agent discloses it is an AI and asks for the
earliest opening, in person or by telehealth. **Nobody talks until the row flips.** The call is the demo.
> Hardik (only if there is dead air after the call): "The transcript comes back, a model pulls out the
> date, and the rules engine counts business days."

**1:40–2:15 — Result + packet (Jai, Aryan drives)**
Row flips to **Past legal deadline**.
> Jai: "Mid-January is about forty business days. The limit is ten. One slow office isn't illegal; the
> duty is on the plan. What matters is this line: no provider we reached could offer a timely
> appointment."

Aryan opens the packet.
> Jai: "So we build the packet: a timestamped call log, a grievance to the plan citing the statute,
> a phone script, and the steps for the state regulator after thirty days. A template, not legal advice."

### 2:15–3:00 — Architecture + every specialty (Ivan, then Jai closes)
> Ivan: "Under the hood: we pull licensed providers near you from the national provider registry, then
> use Bright Data to check each one's public profile. An ElevenLabs agent calls through Twilio. Gemini extracts the date. A
> FastAPI rules engine does the deadline math, and every external call has a timeout and a fallback.
>
> Therapy was the demo, but the rules table covers primary care, specialists, psychiatry and urgent
> care. Same engine, different deadline."

> Jai: "California fined Kaiser fifty million dollars over this. The law exists. GhostBuster does the
> legwork so patients can use it."

**Timing budget** (150 words a minute): opening 30s, search 20s, live call about 40s plus 10s of
Hardik, result and packet 30s, architecture and close 35s. Total about 2:45, leaving 15s of slack.
If the call runs past 2:00 on the clock, skip the packet walk-through.

## If something breaks
| Problem | Do this | Say this |
|---|---|---|
| Phone doesn't ring in 10 seconds | Aryan switches to the finished-search tab | "Here's one we ran a few minutes ago." |
| Judge gives a date inside the deadline | Show Ending A | "That's the good ending: we found someone in time. Here's the other one." Open the packet tab. |
| Judge is vague ("a few weeks") | Let the agent ask a follow-up; if no date, the row shows No answer | "No clear date means we don't guess. It's logged as no answer." |
| Backend down | Play the recording | "Here's a recorded run." |
| Running long at 2:15 | Skip the packet walk-through, go to Ivan | — |

## Likely Q&A (1–2 sentences each)
1. **Who pays?** — Patients never pay. The natural funders are groups already paying for this work by
   hand: patient advocacy and legal aid organizations, employers, and unions; the aggregated ghost-rate
   data is also valuable to regulators and researchers.
2. **Why isn't this already solved?** — Existing tools are sold to insurers to clean their own
   directories. Nobody is on the patient's side producing evidence, and until voice AI the phone calls
   were too expensive to do for one person.
3. **Which plans are covered?** — State-regulated coverage: plans licensed by the Department of Managed
   Health Care (most HMOs, many PPOs, Medi-Cal managed care) plus policies regulated by the Department
   of Insurance, which have the same deadlines. Self-funded employer plans and Medicare are not
   covered, and the app warns about that.
4. **How accurate is the AI?** — We keep the transcript beside every extracted date so a person can
   check it, and anything unclear is logged as "no answer" rather than guessed. The packet tells the
   member to review before sending.
5. **Is it OK for an AI to call clinics? Consent? Disclosure?** — The patient gives permission first,
   and the agent says it is an AI calling on behalf of a patient in its first sentence. The regulation
   allows an appointment request from "an enrollee's representative." This weekend it only calls our own phones.
6. **What about voicemail or no answer?** — It's recorded as "no answer," never as past deadline. An
   unreachable listing is still evidence the directory isn't working, and the letter reports that count separately.
7. **Are you liable if someone relies on this?** — We give an evidence log and a template, labeled as
   not legal advice, and the member reviews, signs and sends it. Before launch we'd have a legal aid
   organization review the templates.
8. **Can a provider legally make you wait longer?** — Yes, if a treating provider decides a longer wait
   won't harm you and notes it in your record. The letter says no one has told the member that, and a
   full schedule is not that exception.
9. **How does this scale without spamming clinics?** — Results are cached and shared, so an office gets
   one call that serves many patients, during office hours. The rules are a table, so adding a specialty or a state is data, not code.
10. **Privacy and HIPAA?** — We ask for insurer, plan type, ZIP and specialty: no name, diagnosis or
    member ID. The agent never gives the office patient details; the member writes their ID on the letter themselves.
11. **What does Bright Data do?** — Providers come from the national provider registry. Bright Data finds
    and reads each one's public profile, pages with no API that block simple scrapers, which is what makes ghost detection possible.
12. **What's next?** — Real calls with clinic-friendly limits, Spanish, an anonymized ghost-rate
    scoreboard by insurer, and other states' rules.

Extra, if asked "does the 1-in-8 number apply to California?" — "No. That study covered five other
states. California's regulator found the same pattern at Kaiser: 19-day average waits against a 10-day limit."

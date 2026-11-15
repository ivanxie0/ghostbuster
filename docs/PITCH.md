# Pitch + Devpost (Jai)

## One-liner
GhostBuster finds licensed providers near you, flags the "ghosts" who aren't really available, calls
the rest for you, and when no one can see you within California's legal deadline it hands you a
ready-to-file grievance with the evidence attached.

## Data-source wording (approved by the team, use exactly)
> "We pull licensed providers near you from the national provider registry, then use Bright Data to
> check each one's public profile."

- NPI Registry supplies the providers. Bright Data finds and checks their public profiles. Gemini reads
  those profiles and the call transcripts.
- **Do not say we read insurer directories** until Ivan confirms a real insurer directory works. The
  agent asks each office on the call whether it takes the member's plan.

## Team wording (use everywhere)
- Per provider: **"Past legal deadline"**. Never "violation" about a single office.
- Overall: **"No provider we reached could offer a timely appointment."**
- Why: the law puts the duty on the **plan's network**, not on each office.
- The packet is an **"evidence log + template, not legal advice."**

## The two numbers, with sources
Say them exactly this way. Do not round them up or change the scope.

**1. "About 1 in 8 calls got an appointment."**
- What it is: a secret-shopper study in *JAMA Health Forum* (October 2026) by Ohio State and Stanford
  researchers. 5,822 calls to mental health clinicians listed in the directories of the largest
  commercial insurer in five states. About one in eight calls (12%) produced an appointment option.
- Limits to admit if asked: the five states were Delaware, Montana, New Jersey, Rhode Island and
  Virginia, **not California**, and the callers posed as PPO members. We read the press coverage, not the paper itself.
- Sources: https://www.healthcaredive.com/news/ghost-networks-haunt-mental-health-access-study-finds/833643/
  and https://www.healthcarefinancenews.com/news/mental-health-ghost-networks-limit-access-commercially-insured
- Safe sentence: "A study published last month called almost six thousand therapists and psychiatrists
  listed in insurer directories. About one call in eight ended with an appointment option."

**2. "California fined Kaiser $50 million."**
- What it is: on October 12, 2023 the DMHC announced a $200 million settlement with Kaiser over
  behavioral health access: a $50 million fine, the largest the department had issued, plus $150 million
  of required investment over five years. Regulators found follow-up therapy waits averaging 19 days
  against the 10-business-day standard, and that Kaiser did not consistently arrange out-of-network care.
- Sources: DMHC press release https://www.dmhc.ca.gov/Resources/Newsroom/PressReleases/October12,2023.aspx
  and CalMatters https://calmatters.org/health/2023/10/kaiser-permanente-california-behavioral-health-settlement/
- Safe sentence: "California's regulator fined Kaiser fifty million dollars in 2023 for exactly this:
  therapy waits nearly double the legal limit."

**The law, in one breath:** Health & Safety Code §1367.03 gives California health plans 10 business days
for a therapy appointment, 15 for a specialist, 48 hours for urgent care. If the network can't do it,
the plan must arrange out-of-network care at in-network cost. Details and links: `docs/RULES.md`.

## Devpost draft

### Inspiration
Finding a therapist who takes your insurance usually means calling down a list. Most numbers are wrong,
full, or never call back. A study published last month found that only about one in eight calls to
mental health clinicians in insurer directories led to an appointment option. California actually has
a strong law for this: your plan must get you a therapy appointment within 10 business days, and if
its network can't, it must arrange one out of network at your in-network cost. Almost nobody uses that
right, because the patient has to prove the network failed, one phone call at a time, while they are
already struggling. We wanted to take the phone calls off the patient.

### What it does
1. You enter your insurer, plan type, ZIP code and the kind of care you need.
2. GhostBuster pulls licensed providers near you from the national provider registry, then uses Bright
   Data to check each one's public profile. Providers who are not really available are flagged as ghosts.
3. With your permission, an AI voice agent calls the remaining offices. It says up front that it is an
   AI assistant calling on behalf of a patient, and asks for the earliest opening, in person or by telehealth.
4. It converts each answer to business days and compares it with the legal deadline for that type of
   care.
5. If someone can see you in time, you get their details. If no provider we reached could offer a
   timely appointment, you get a packet: the timestamped call log, a timely access grievance addressed
   to your plan, a phone script for member services, and the steps for escalating to the state
   regulator after 30 days.

It is honest about limits. The first screen shows 988 for anyone in crisis. It warns when a plan may be
outside California's rules, such as self-funded employer plans. The packet is labeled as an evidence log and
template, not legal advice.

### How we built it
- **Frontend:** Next.js (App Router), TypeScript, Tailwind. Search form, live results view that polls
  as calls finish, printable packet.
- **Backend:** Python FastAPI with a small pipeline: scrape, ghost check, call, deadline check, packet.
- **Provider data:** the national NPI Registry supplies licensed providers near the member. Bright Data
  (Web Unlocker and SERP) finds and reads each one's public profile, Gemini classifies what the profile
  says about availability, and results are cached in Neon Postgres.
- **Voice:** an ElevenLabs conversational agent placing outbound calls through Twilio. A post-call
  webhook returns the transcript.
- **Extraction:** Gemini reads the transcript and pulls out the earliest appointment date.
- **Rules engine:** a deadline table verified line by line against Health & Safety Code §1367.03 and
  28 CCR §1300.67.2.2, with business-day math that skips weekends and California holidays.
- **Safety net:** every external call has a timeout and a cached fallback, and the whole app runs in a
  fake mode with no keys, so the demo cannot hang.
- During the hackathon the agent only dials our own phones. It never calls a real clinic.

### Challenges we ran into
- **Getting the law right.** Our first draft labeled each slow provider a "violation." Reading the
  statute showed that the duty sits with the plan's network, not each office, so we changed the
  product language and the packet into a grievance to the plan.
- **Exceptions.** A treating provider can lawfully extend the wait, follow-up visits for most
  specialties have no fixed deadline, and telehealth offers count. Each of those changed the rules table.
- **Messy phone answers.** "Maybe mid-December" has to become a date, and voicemail has to become "no
  answer" rather than a guess.
- **Four people, one repo, one day.** We fixed a data contract first so the scraper, calls, rules and
  UI could be built in parallel.

### Accomplishments that we're proud of
- An end-to-end run: search, ghost flags, a live AI phone call, deadline math, and a printable packet.
- Every legal number in the app traces to a statute section we read ourselves.
- The app says what it cannot do: which plans may not be covered, and that it is not legal advice.

### What we learned
- The regulation says a request can come from "an enrollee's representative," and that a grievance
  about appointment delay itself counts as a request. That is what makes an assistant acting for the
  patient legitimate, and why the packet is a grievance.
- The useful output is not a verdict. It is evidence a patient can hand to someone with authority.
- Voice agents are easy to start and hard to make reliable, so timeouts and fallbacks came first.

### What's next for GhostBuster
- Real calls, with clinic-friendly limits: office hours only, one call per office per week, shared results.
- An opt-in, anonymized ghost-rate scoreboard by insurer and region for regulators, journalists and advocates.
- Spanish for the app, the agent and the packet.
- Rules tables for other states with wait-time standards, and for California's insurance-department plans.
- Review of the templates by a legal aid organization.

### Built with
FastAPI, Next.js, Tailwind, Neon Postgres, Bright Data, NPI Registry, ElevenLabs, Twilio, Gemini

## Prize tracks / sponsor angles
- **Bright Data:** it is how we find and read each provider's public profile, pages that have no API
  and block simple scrapers. Without it there is no ghost detection.
- **ElevenLabs:** the live call is the demo. The agent discloses that it is an AI in its first sentence.
- **Gemini:** turns a messy receptionist answer into a date the rules engine can use.
- **Social good / health:** mental health access, built on an existing legal right.

Q&A answers are in `docs/DEMO.md`.

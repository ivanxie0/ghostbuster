# Research notes: background PDFs (Ivan)

Ivan's `ghostbuster files` folder, not in the repo; reviewed 2026-11-14.
Three AI-generated research reports (ideation ranking, 44-page blueprint, a verification report that
fact-checks the blueprint) plus the official Hacker Guide. Their citations are mostly secondary sites and
were not re-checked. **Where they disagree with `docs/RULES.md`, RULES.md wins** (Jai read the statute).

Do not take these from the reports:
- UC SHIP as a covered plan. It is self-funded by the UC Regents and outside the Knox-Keene rules.
- AB 298 and SB 1280. The verification report says neither became law.
- AB 280 directory-accuracy percentages or penalties. Reported as removed before passage; check
  leginfo before citing AB 280 at all.
- The "55%" and "82%" ghost figures as California numbers. Use the stats in `docs/PITCH.md`.
- "Calling 3–5 providers legally triggers out-of-network coverage." That is an advocacy-blog rule of
  thumb, not statute. Our claim stays "no provider we reached could offer a timely appointment."
- Initial therapy = 15 business days (ideation report). It is 10; 15 is specialists/psychiatrists.
- "Twilio trial cannot work with ElevenLabs." We bought a number on the trial and it works; the real
  limits are verified numbers only and the trial preamble (see `backend/calls/README.md`).
- Prize tracks "Best Use of Mastra" and "UCSD Basement Most Innovative". Neither is in the Hacker Guide.
  Guide tracks: Best Overall, Bright Data Data for Good, ElevenLabs, Neon, SpaceX AI A-Team, MLH
  (Gemini API, Solana, Tiger Data, Vultr, GoDaddy).

Blueprint features that are out of scope (do not build): Mastra/TypeScript stack, multi-source entity
resolution, DCA license checks, out-of-network therapist matching, Single Case Agreement demand, State
Fair Hearing request, live transcript websocket, call audio recording (as a product feature).

Decision (2026-11-14): we keep "recorded and transcribed" in the agent's opening line and system prompt
(Hardik, 5dd1d17) and in the consent card (Aryan). ElevenLabs keeps call audio, so we disclose recording,
not just transcription. Penal Code §632 is still unverified (below); full disclosure is the conservative choice.

Still unverified, so stay conservative:
- Whether scraping Psychology Today / Headway / Alma is allowed by their terms. Prefer NPI Registry,
  insurer public directories and a practice's own site.
- The reports' Bright Data outage claims (Web Unlocker 502s, retired proxies). Keep timeouts + cache regardless.
- The out-of-network clocks in 28 CCR §1300.74.72 (5 calendar days notice, 90-day self-arrangement).
  Not read by us; keep them out of the packet unless Jai verifies.
- Expedited grievance timing (72 hours vs 3 calendar days) and Penal Code §632 (call recording/transcription).

# GhostBuster — research notes behind design v2

Short findings with sources, for the team and for judges' Q&A. Searched Nov 15, 2026.

## First impressions
- People judge a site's visual appeal in about **50 milliseconds**, and those snap judgments match their
  ratings after longer viewing (Lindgaard et al., *Behaviour & Information Technology*, 2006).
  https://www.nature.com/news/2006/060109/full/news060109-13.html
- That first impression creates a **halo effect**: it colours later judgments of usability and credibility.
  https://websiteoptimization.com/?p=2578
- NN/g: users often leave a page within **10–20 seconds** unless it proves its value.
  https://speckyboy.com/make-sure-users-trust-website/

## Trust and credibility
- NN/g's four trust factors still hold after decades: **design quality, upfront disclosure,
  comprehensive and current content, and connection to the rest of the web.**
  https://nngroup.com/articles/trustworthy-design/
- Stanford Web Credibility guidelines (Fogg, about 4,500 participants): make claims easy to verify (cite
  sources), show a real organization, show real and trustworthy people, make contact easy, match the visual
  design to the purpose, keep content current, and show when it was last reviewed.
  https://credibility.stanford.edu/guidelines · https://en.wikipedia.org/wiki/Stanford_Web_Credibility_Project

## Modern healthcare and insurance sites
- One Medical: minimalist and modern, short scannable blocks with bold icons.
  https://azurodigital.com/healthcare-website-examples/
- Oscar: friendly, well-written copy that matches its visual design. https://bigdropinc.com/blog/website-design-for-healthcare
- Zocdoc: patient-first booking design. https://cliquestudios.com/the-9-best-healthcare-websites-according-to-digital-designers-strategists
- Headway: a calm, light insurance-search marketplace that puts the form early and uses warm therapy photography.
  https://www.webdesignhot.com/design.md/headway/
- Oscar, Flatiron and One Medical all use medium-weight serifs (Tiempos, GT Super) to look tech-forward but approachable.
  https://beckershospitalreview.com/hospital-management-administration/why-this-font-is-gaining-popularity-in-healthcare-advertising.html

## Fonts
- Atkinson Hyperlegible Next (Braille Institute, 2025) is free on Google Fonts, built for low-vision legibility,
  and comes in 7 weights with a monospace companion.
  https://lagrandeobserver.com/?p=1350 · https://fontsource.org/fonts/atkinson-hyperlegible-next/about

## Inclusive imagery and language
- Harvard Center for Health Communication: use imagery that reflects diverse experiences of health
  (race, gender, disability, age, body size). https://www.hsph.harvard.edu/chc/resources/effective-health-communication-using-inclusive-language-and-images/
- Avoid tokenism: a single minority person with no context reads as tokenism, so represent people across the whole set.
  https://contently.com/2024/09/13/diverse-stock-photos-inclusive-images/
- Patients have reported not being sure a service was for them based only on the imagery.
  https://brazzellmarketing.com/Marketing-Matters/why-successful-businesses-use-diversity-in-their-marketing-it-sells/
- Inclusive forms: ask for gender only when you need it. GhostBuster never needs it, so it never asks.
  https://equity.ubc.ca/resources/gender-diversity/inclusive-forms/
- Disability-inclusive stock photography resources: https://hsph.harvard.edu/research/health-communication/resources/inclusive-language-and-images

## Laws and rules relevant to the design
- **HHS Section 504 rule:** HHS-funded health programs (including Medicaid managed care plans and insurers in the
  Marketplaces) must meet **WCAG 2.1 AA** on web and mobile. HHS later extended the compliance dates by one year (an interim final rule, May 2026).
  https://accessible.org/healthcare/ · https://app.govly.com/public/opportunities/16539216
- **ADA + California Unruh Act:** courts treat healthcare websites as public accommodations; Unruh adds
  $4,000 in statutory damages per violation. https://www.clym.io/blog/ada-and-unruh-act-lawsuits-your-guide-for-california-healthcare-websites
- **FCC (Feb 2024):** AI-generated voices are "artificial" under the TCPA, so consent rules apply to AI voice calls.
  https://www.orrick.com/en/Insights/2024/02/Did-the-FCC-Really-Ban-AI-Generated-Voice-Calls-No-But-Restrictions-Apply
- **California AB 3030 (effective Jan 1, 2025):** health facilities and practices using generative AI for patient
  communications about clinical information must disclose AI and give a way to reach a human.
  Administrative matters like scheduling are excluded.
  https://www.insideprivacy.com/uncategorized/california-enacts-health-ai-bill-and-protections-for-neural-data/
- Healthcare tracking-pixel litigation: avoid third-party pixels on health pages.
  https://www.clym.io/blog/ada-and-unruh-act-lawsuits-your-guide-for-california-healthcare-websites

Not legal advice. These notes are design inputs, not a compliance opinion.

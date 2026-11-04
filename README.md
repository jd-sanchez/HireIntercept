# HireIntercept (prototype)

Local prototype that imports synthetic job postings, flags jobs for overseas remote placement, scores and matches them against a synthetic candidate pool, drafts (never sends) A/B outreach, and simulates campaign tracking with stop rules. Synthetic data only: `.example` domains are fictional, nothing is sent, no external calls, no LLM.

**Live demo:** https://jd-sanchez.github.io/HireIntercept/

**Walkthrough video:** https://drive.google.com/file/d/1a1ilfWJQ7xMWfFjs4R1WRC0Y4HWJPsJR/view?usp=sharing

## Setup

Node 20+.

```bash
npm install
npm run dev     # API on :3001 + web on http://localhost:5173
npm test        # core (60) + API (13) tests
npm run build   # typecheck core/server, build web
```

## Architecture

npm workspaces, each package with its own `src/`:

- `packages/core`: pure domain logic (import, eligibility, dedup, matching, scoring, drafts + claim linter, campaign metrics, sequence/stop-rule engine). No framework; the only I/O is the CSV loader. Pure so every rule is unit-testable and the same logic can sit behind real integrations unchanged.
- `packages/server`: Fastify JSON API. Loads the CSVs at startup, computes everything once, serves from memory.
- `packages/web`: React + Vite. Reads only the API. A small custom component layer in `src/components/` (one CSS file per component); Tailwind is used only to define the design tokens (colour, type, radius) in `src/index.css`, and screens use no utility classes. Core is shared through `@hireintercept/core/*` subpath exports (`types`, `campaign`, `sequences`, `math`): types, enums and pure helpers only, so no Node code (the CSV loader) reaches the browser.

Integration stubs (interfaces in `core/src/integrations.ts`): `ProspectSource` (CSV jobs), `CandidateProvider` (CSV candidates), `EventIngestor` (CSV events), `OutreachSender` (`NoopSender` records "would send"). These mark where Apollo and Finally Staff plug in.

## Dashboard

Three screens, all driven by the API:

- **Jobs:** four tiles that split all jobs with no overlap and click to filter the table: **Ready to contact** (eligible, verified candidate, working hours known), **Confirm hours first** (eligible with a verified candidate, but the job does not state whether U.S. hours are required), **Needs verification** and **Ineligible**; then a score distribution (click a row to set a minimum score), and the ranked table with industry, role, eligibility and minimum-score filters. A row opens the job drawer: score breakdown (each line with its own points, plus a bold total per component), eligibility reasons, candidate matches (labelled synthetic), the two drafts, and merged-duplicate conflicts. Posting IDs anywhere in the app open the same drawer. The **Import details** button opens a drawer with row counts per file, how duplicate postings are merged (30 postings become 28 jobs), and a side-by-side comparison of every merged group.
- **Campaign:** headline insight, KPI tiles with A/B splits, a scope bar (all events or eligible-only), a dual funnel (A and B per stage, each showing the share kept from the previous stage), negative signals, a grouped metrics table with a difference column, and a **Data quality** card. "Biggest gap" is the stage with the widest A/B conversion difference, and only counts when both variants had at least 3 contacts at the previous stage, so 1-versus-0 noise is ignored. Data quality lists each warning with the number of jobs affected, sorted by count (red only where a rule was broken), then the notes on how to read the numbers; it is the same in both scopes. Open rate is always marked approximate; the sample-size message never declares a winner.
- **Follow-ups:** the proposed schedule, state counts, step outcomes and why follow-ups stopped side by side, then contact timelines with a switch between the six required stop-rule examples and every contact (state and search filters). The **Do-not-contact list** opens in a drawer. Rule violations show the actual reason from the data (for example "Sent to an ineligible contact"; JOB-009 has two, since both recorded sends went to an ineligible contact).

The UI loads the Geist typeface from Google Fonts; offline it falls back to the system font. Nothing else leaves the machine.

## Data assumptions & decisions

- **One contact per domain.** The data has no emails, so `contact_key` = normalized domain; stops and suppressions apply to every posting at that domain.
- **A bounce means "undeliverable", not "invalid address".** The data has no email addresses and no bounce reason, so a dead address cannot be told apart from a temporary failure such as a full mailbox. Every bounce stops the sequence for that domain, which is the safe choice, and the contact is flagged `undeliverable`.
- **Eligibility rules run in order and the first match wins:** on-site, U.S.-only, license required, remote eligibility not stated, a note mentioning a restriction, otherwise eligible. A job that breaks several rules is decided by the first one, and the others are recorded and shown as "Also: …" in the job drawer and the import details. So the two licensed nurse jobs (JOB-009, JOB-019) are decided as "U.S.-only" and list "Also: Requires local license"; the license rule decides no job on its own in this data.
- **Most-restrictive merge for duplicates** (dedup key: domain + title). Eligibility takes the worst status across the group, with reasons from every member, because wrongly pitching an ineligible role is worse than a missed lead. Display fields come from the most recent posting; the repost signal is the max.
- **"Unclear local restriction" notes → needs verification**, never assumed eligible. Needs-verification scores are marked provisional and drafts are held.
- **"Verified" match** means every required skill is covered, the candidate is `available_now=yes`, and `us_hours_available` does not contradict the job. If the job's `us_hours_required` is `unknown` the match is still verified but carries a "Confirm working hours" note, and the job counts under **Confirm hours first**, not **Ready to contact**. Candidates are only ever described as available or able to work U.S. hours when the data says yes.
- **Follow-up cadence is assumed.** The schedule is steps on days 1, 4, 8 and 15. The events only evidence steps 1 and 2 (days 1 and 4); days 8 and 15 are a proposal. "As of" is day 4, the latest event, so steps 3 and 4 show as not yet due.
- **Opens are not inferred from replies** (JOB-012 replied with no recorded open). Unique opens = distinct (contact, step); the open rate is always labeled approximate.
- **Structured fields beat free text.** Five postings (JOB-005, 011, 017, 023, 029) have the note "role reposted" but `repost_count` of 0; scoring uses `repost_count` and the merge, not the note. The "prior recruiter inquiry" note is not used in scoring. Both are visible in the data but not treated as signals.
- **Odd events are taken as given.** JOB-001's meeting and client win are recorded on day 1, the same day as its first send. JOB-008 and JOB-021 have a bounce and no delivery, so they count as sent but not delivered.
- **Industry is used as given**, even where company names look mismatched (e.g. "Oakline Legal Group" in E-commerce).
- **Repeat postings are a signal, not proof.** The demand-signals section of every score carries the caveat "a signal of possible ongoing need, not evidence of hiring difficulty".
- **Held vs active:** a needs-verification contact is `held` only if nothing has been sent yet; contacts already in flight (JOB-018) stay `active`.
- **Warnings are judged against the candidate pool:** "Variant A sent with no verified candidate" checks whether any verified candidate exists for the role, even if the role is ineligible.

## Simplifications

No database (in-memory, computed at startup), a fixed "as of" day (latest event, day 4), deterministic email templates instead of an LLM, no A/B significance testing (never declares a winner). The six featured stop-rule examples on the Follow-ups screen are picked by posting ID in the UI and their captions are static text, so they describe the bundled data rather than adapting to new data. Licensed-role detection matches "license" in the title or skills only, so a licence mentioned only in the notes would be missed. The web package has no automated tests.

## Real integrations

- **Apollo:** company/contact sourcing and enrichment behind `ProspectSource`; sequence sending behind `OutreachSender`; webhook event ingestion behind `EventIngestor` with idempotent event ids; two-way suppression sync; API key management and rate limits.
- **Finally Staff:** candidate supply behind `CandidateProvider`. Their actual API is unknown and must be confirmed. Needs real-time availability, candidate consent before a profile appears in outreach, and PII handling.

## Risks

- **Technical: suppression races.** The sending platform and this system can get out of sync. For example, a reply or unsubscribe may arrive just before a scheduled send, and we still send. Fix: check suppression right before every send, give each event a unique id so repeats are ignored, and treat the sender as the source of truth.
- **Commercial: targeting and promise risk.** 3 of 4 positive replies came from jobs we cannot serve. Also, one candidate could be pitched to several companies at once. Each of the five verified candidates is currently proposed to three jobs. Fix: check eligibility before any outreach, and reserve candidates and get their consent before offering them.

## What I'd do next with more time

- Postgres persistence and a human verification workflow (approve/reject needs-verification jobs, with rescoring).
- An interactive "simulate as of day N" slider.
- A dedicated import/audit log page.
- Real Apollo and Finally Staff adapters behind the existing interfaces.
- Docker for one-command setup.
- End-to-end and component tests for the web app (Playwright).
- Statistical significance testing for A/B once sample sizes allow.
- Fuzzy skill and title matching with a reviewed synonym list.
- Candidate reservation so one candidate isn't pitched to many jobs.

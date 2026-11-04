# HireIntercept (prototype)

Local prototype that imports synthetic job postings, flags opportunities for overseas remote placement, scores and matches them against a synthetic candidate pool, drafts (never sends) A/B outreach, and simulates campaign tracking with stop rules. Synthetic data only: `.example` domains are fictional, nothing is sent, no external calls, no LLM.

## Setup

Node 20+.

```bash
npm install
npm run dev     # API on :3001 + web on http://localhost:5173
npm test        # core (59) + API (11) tests
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

- **Opportunities:** a "Ready to contact" tile (eligible roles with a verified candidate), eligibility tiles that filter the table, a score distribution (click a row to set a minimum score), and the ranked table with industry, role, eligibility and minimum-score filters. A row opens the lead drawer: score breakdown with reasons, eligibility reasons, candidate matches (labelled synthetic), the two drafts, and merged-duplicate conflicts. Posting IDs anywhere in the app open the same drawer.
- **Campaign:** headline insight and warnings, KPI tiles with A/B splits, a scope bar (all events or eligible-only), a dual funnel (A and B per stage, each showing the share kept from the previous stage), negative signals, a grouped metrics table with a difference column, and data-integrity warnings. "Biggest gap" is the stage with the widest A/B conversion difference, and only counts when both variants had at least 3 contacts at the previous stage, so 1-versus-0 noise is ignored. Open rate is always marked approximate; the sample-size message never declares a winner.
- **Sequences:** state counts, step outcomes (sent, scheduled or cancelled at each scheduled step, with later steps marked not due as of the latest event), why sequences stopped (by stop rule), the six required stop-rule examples and every contact as a day-by-day timeline with a state and search filter, and the suppression list. Rule violations show the actual reason from the data (for example "Sent to an ineligible contact").

The UI loads the Geist typeface from Google Fonts; offline it falls back to the system font. Nothing else leaves the machine.

## Data assumptions & decisions

- **One contact per domain.** The data has no emails, so `contact_key` = normalized domain; stops and suppressions apply to every posting at that domain.
- **Most-restrictive merge for duplicates** (dedup key: domain + title). Eligibility takes the worst status across the group, with reasons from every member, because wrongly pitching an ineligible role is worse than a missed lead. Display fields come from the most recent posting; the repost signal is the max.
- **"Unclear local restriction" notes → needs verification**, never assumed eligible. Needs-verification scores are marked provisional and drafts are held.
- **Opens are not inferred from replies** (JOB-012 replied with no recorded open). Unique opens = distinct (contact, step); the open rate is always labeled approximate.
- **Industry is used as given**, even where company names look mismatched (e.g. "Oakline Legal Group" in E-commerce).
- **Repeat postings are a signal, not proof.** Every demand-signal reason carries the caveat "a signal of possible ongoing need, not evidence of hiring difficulty".
- **Held vs active:** a needs-verification contact is `held` only if nothing has been sent yet; contacts already in flight (JOB-018) stay `active`.
- **Warnings are judged against the candidate pool:** "Variant A sent with no verified candidate" checks whether any verified candidate exists for the role, even if the role is ineligible.

## Simplifications

No database (in-memory, computed at startup), a fixed "as of" day (latest event, day 4), deterministic email templates instead of an LLM, no A/B significance testing (never declares a winner). The six featured stop-rule examples on the Sequences screen are picked by posting ID in the UI and their captions are static text, so they describe the bundled data rather than adapting to new data. The web package has no automated tests.

## Real integrations

- **Apollo:** company/contact sourcing and enrichment behind `ProspectSource`; sequence sending behind `OutreachSender`; webhook event ingestion behind `EventIngestor` with idempotent event ids; two-way suppression sync; API key management and rate limits.
- **Finally Staff:** candidate supply behind `CandidateProvider`. Their actual API is unknown and must be confirmed. Needs real-time availability, candidate consent before a profile appears in outreach, and PII handling.

## Risks

- **Technical: suppression races** between the sending platform and this system (a reply or unsubscribe arriving just before a scheduled send). Mitigation: check suppression right before each send, use idempotent events, and make the sender the source of truth.
- **Commercial: targeting and promise risk.** 3 of 4 positive replies came from leads we cannot serve, and one candidate would be pitched to several companies. Mitigation: verify eligibility before outreach, plus candidate reservation and consent.

## What I'd do next with more time

- Postgres persistence and a human verification workflow (approve/reject needs-verification leads, with rescoring).
- An interactive "simulate as of day N" slider.
- A dedicated import/audit log page.
- Real Apollo and Finally Staff adapters behind the existing interfaces.
- Docker for one-command setup.
- End-to-end and component tests for the web app (Playwright).
- Statistical significance testing for A/B once sample sizes allow.
- Fuzzy skill and title matching with a reviewed synonym list.
- Candidate reservation so one candidate isn't pitched to many leads.

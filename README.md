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
- `packages/web`: React + Vite + Tailwind, TanStack Table, Recharts. Reads only the API. Core is shared through `@hireintercept/core/*` subpath exports (types and enums only, so no Node code reaches the browser).

Integration stubs (interfaces in `core/src/integrations.ts`): `ProspectSource` (CSV jobs), `CandidateProvider` (CSV candidates), `EventIngestor` (CSV events), `OutreachSender` (`NoopSender` records "would send"). These mark where Apollo and Finally Staff plug in.

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

No database (in-memory, computed at startup), a fixed "as of" day (latest event, day 4), deterministic email templates instead of an LLM, no A/B significance testing (never declares a winner).

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
- End-to-end tests (Playwright).
- Statistical significance testing for A/B once sample sizes allow.
- Fuzzy skill and title matching with a reviewed synonym list.
- Candidate reservation so one candidate isn't pitched to many leads.

# Real Hires — HireIntercept paid developer assessment

## Objective
Build a small, working local prototype that takes mock job openings, identifies employers likely to need international remote staff, matches available candidates where appropriate, simulates an A/B outbound campaign, and displays a useful performance dashboard. We are assessing architecture, execution, correctness and practical judgment, not visual polish.

**Compensation:** $50 USD fixed for this assessment, with a strict maximum of **5 working hours**. Confirm your acceptance, proposed start date and delivery date **before starting**. Do not do any unpaid work. No production or live integrations are required; the prototype must run locally.

## Inputs (all synthetic; do not contact these employers)
- `hireintercept_sample_jobs.csv`: 30 fake job-posting records, including some international-compatible and some ineligible jobs; also includes repeat listings that should be deduplicated or linked.
- `hireintercept_sample_candidates.csv`: 10 fake candidate profiles with skills and availability.
- `hireintercept_sample_events.csv`: mock campaign activity; includes sends, deliveries, opens, duplicate opens, replies, unsubscribes, bounces, booked meetings and a client win.

Company domains ending in `.example` are fictional. Never send actual emails, call the companies, scrape live websites, or create real Apollo records during the test.

## Requirements
1. **Job opportunity view:** Import and display the job CSV. Normalize and deduplicate openings by domain + role (showing how duplicates were handled). Mark U.S.-only, on-site and licensed locally required roles as ineligible for overseas placement; label unclear remote eligibility for human verification rather than assuming it qualifies.
2. **Explainable priority scoring:** Compute a 0–100 score using at least role/remote eligibility, urgency or repeat-posting signals, and potential candidate fit. Show why each eligible opportunity received its score and let a user view/sort high-priority leads. Do not claim repeated posting proves hiring trouble.
3. **Candidate suggestions:** Match job skill requirements against candidate skills. Do not describe a candidate as available if `available_now=no` or able to work U.S. hours if `us_hours_available=no`. Show actual evidence and gaps in the match, and clearly label matches as synthetic.
4. **Two outbound variants:** Generate a short, truthful, first-contact email for each eligible lead using two different offer approaches: A, candidate-first if a verified match exists; B, hiring-process/speed-first. If no verified match exists, do not invent a candidate. Do not actually send messages.
5. **Campaign simulation:** Import mock events and show, by A/B variant and overall, messages sent, delivered, unique opens, bounce count, positive replies, booked meetings and clients won. Open rate should be marked approximate. Duplicate opens must not inflate unique opens.
6. **Stop rules:** A simulated reply, bounce or unsubscribe must stop all pending follow-ups to that contact. Demonstrate this using examples from the input data, including a proposed follow-up schedule.
7. **Readable dashboard:** Simple filters by industry and role, a ranked opportunities list, campaign funnel and A/B comparison. A clear UI is desirable, but correctness matters more than appearance.

## Deliverables
- A GitHub repository or zipped source code (not a screenshot-only demo).
- A working demo URL or a 3–5 minute walkthrough recording showing end-to-end functionality.
- Clear run/setup instructions and a short `README` with data assumptions, architecture, any simplifications, and what would be needed for real Apollo and Finally Staff integrations.
- A brief note identifying one technical risk and one commercial risk you would address before production.

## Evaluation (100 points)
- Correct import, deduplication, and international eligibility: 20
- Explainable scoring and honest candidate matching: 20
- A/B outreach and reliable stop/suppression rules: 25
- Accurate tracking and dashboard: 20
- Code quality, setup, judgment, and communication: 15

## Guardrails
Use only the attached synthetic data. No live email, scraping, external paid services, customer records, LinkedIn automation, or payment information. Do not add dependencies that require paid keys. If you would normally use a third-party API, stub it locally and explain the real integration boundary. Please confirm terms and timing first, then work within the agreed five-hour timebox.

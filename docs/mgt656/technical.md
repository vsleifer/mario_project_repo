# Technical Challenge and Testing Strategy

Complete this document as the team chooses, implements, and verifies its technical-challenge items. The assignment recommends about three substantial items that work in the deployed app and handle failure. Do not list planned work as completed. No technical-challenge item is claimed as complete in the Sprint 1 report.

## Technical-challenge items

For each completed item, describe what it does, list the main file paths and merged pull requests, and explain how a grader can see it working on staging or production. Include its failure behavior where relevant.

Select and document completed items in later sprints. Do not count baseline assignment requirements as technical-challenge items unless they go beyond the required behavior.

## Testing strategy

Document which behaviors are tested at each level, what is mocked, and what is deliberately not tested (with a reason). Tests must not call the real LLM or other external services.

- Unit tests: Django `TestCase` tests cover auth flows, user persistence, repeatable grader seeding, profiles and the campus map, A/B variant persistence, visitor-level event limits, stats calculation, and the AI advisor (prompt contents, saving tips, the per-user daily limit, and every failure path).
- Integration tests: Django's test client exercises routes, sessions, the ORM, and the test database together. All 32 tests passed locally against SQLite in Sprint 2; PostgreSQL behavior is checked by hand on staging.
- Browser/end-to-end tests, if used: None yet. The current suite does not automate a real browser or responsive-layout checks.
- LLM and external-service mocks: The AI advisor calls OpenRouter from the server only (`core/ai.py`). View tests mock `core.ai.request_completion`; client tests mock `urllib.request.urlopen` to check the request (URL, key header, model, timeout) and the handling of network errors, timeouts, malformed replies, empty replies, and over-long replies. No test calls the real LLM.
- Behaviors not tested and why: The quality of the LLM's tips is not tested automatically, because the output varies; the team reads sample tips on staging. Hosted staging/production behavior and PostgreSQL are not covered by the local run; a public deployment is not recorded yet. The A/B suite checks that both variants can be assigned, not the statistical quality of a 50/50 sample, which requires many independent visitors.
- How to run the test suite: Install `requirements.txt`, set `SECRET_KEY` and a PostgreSQL `DATABASE_URL`, then run `python manage.py test`. Django creates a separate test database.
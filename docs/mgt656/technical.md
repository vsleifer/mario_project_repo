# Technical Challenge and Testing Strategy

Complete this document as the team chooses, implements, and verifies its technical-challenge items. The assignment recommends about three substantial items that work in the deployed app and handle failure. Do not list planned work as completed. No technical-challenge item is claimed as complete in the Sprint 1 report.

## Technical-challenge items

For each completed item, describe what it does, list the main file paths and merged pull requests, and explain how a grader can see it working on staging or production. Include its failure behavior where relevant.

Select and document completed items in later sprints. Do not count baseline assignment requirements as technical-challenge items unless they go beyond the required behavior.

## Testing strategy

Document which behaviors are tested at each level, what is mocked, and what is deliberately not tested (with a reason). Tests must not call the real LLM or other external services.

- Unit tests: Django `TestCase` tests cover auth flows, user persistence, repeatable grader seeding, A/B variant persistence, visitor-level event limits, and stats calculation.
- Integration tests: Django's test client exercises routes, sessions, the ORM, and the test database together. All 12 tests passed locally against SQLite; PostgreSQL behavior still needs verification in staging.
- Browser/end-to-end tests, if used: None yet. The current suite does not automate a real browser or responsive-layout checks.
- LLM and external-service mocks: The app does not yet include an LLM or other external-service integration, so no external calls occur in the current tests. Mock any such integrations before adding tests that exercise them.
- Behaviors not tested and why: Hosted staging/production behavior and PostgreSQL are not covered by the local run; a public deployment is not recorded yet. The A/B suite checks that both variants can be assigned, not the statistical quality of a 50/50 sample, which requires many independent visitors.
- How to run the test suite: Install `requirements.txt`, set `SECRET_KEY` and a PostgreSQL `DATABASE_URL`, then run `python manage.py test`. Django creates a separate test database.
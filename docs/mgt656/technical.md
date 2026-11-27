# Technical Challenge and Testing Strategy

Complete this document as the team chooses, implements, and verifies its technical-challenge items. The assignment recommends about three substantial items that work in the deployed app and handle failure. Do not list planned work as completed. No technical-challenge item is claimed as complete in the Sprint 1 report.

## Technical-challenge items

For each completed item, describe what it does, list the main file paths and merged pull requests, and explain how a grader can see it working on staging or production. Include its failure behavior where relevant.

Select and document completed items in later sprints. Do not count baseline assignment requirements as technical-challenge items unless they go beyond the required behavior.

### 1. CI: tests and linting on every pull request, with merging blocked on failure (Sprint 3, in progress)

- **What it does:** every pull request and every push to `main` runs a GitHub Actions job that lints the code with `ruff`, fails if a model change has no migration, runs Django's system checks, and runs the whole test suite against a real PostgreSQL 17 database. Branch protection on `main` requires this `lint-and-test` check to pass before a pull request can be merged.
- **Main files:** `.github/workflows/ci.yml`, `pyproject.toml` (linter settings), `requirements-dev.txt`. Story [#26](https://github.com/vsleifer/mario_project_repo/issues/26); pull request to be linked here once merged.
- **How to see it working:** open any pull request's **Checks** tab, or the repo's [Actions](https://github.com/vsleifer/mario_project_repo/actions) page. A pull request with a failing test shows a red ✗, and the merge button stays disabled.
- **Failure handling:** a failing lint step, missing migration, or failing test fails the check and blocks the merge. CI needs no secrets: it uses throwaway database credentials and an empty `OPENROUTER_API_KEY`, so no test can reach the real LLM. The job stops after 15 minutes, and a newer push to the same pull request cancels the older run.

## Testing strategy

Document which behaviors are tested at each level, what is mocked, and what is deliberately not tested (with a reason). Tests must not call the real LLM or other external services.

- Unit tests: Django `TestCase` tests cover auth flows, user persistence, repeatable grader seeding, profiles and the campus map, A/B variant persistence, visitor-level event limits, stats calculation, minigame score validation (accepted range, malformed JSON, login, CSRF), and the AI advisor (prompt contents, saving tips, the per-user daily limit, and every failure path).
- Integration tests: Django's test client exercises routes, sessions, the ORM, and the test database together. All 45 tests passed locally against SQLite in Sprint 2. Since Sprint 3, CI runs every test against PostgreSQL 17 on each pull request.
- Browser/end-to-end tests, if used: None automated yet. The five minigames run in browser JavaScript, so their play logic is checked by playing them in a browser at desktop and phone sizes; the server side (each game's score range and saving) is covered by Django tests.
- LLM and external-service mocks: The AI advisor calls OpenRouter from the server only (`core/ai.py`). View tests mock `core.ai.request_completion`; client tests mock `urllib.request.urlopen` to check the request (URL, key header, model, timeout) and the handling of network errors, timeouts, malformed replies, empty replies, and over-long replies. No test calls the real LLM.
- Behaviors not tested and why: The quality of the LLM's tips is not tested automatically, because the output varies; the team reads sample tips on staging. Hosted staging and production behavior (Render, Neon, real environment variables) is not covered by automated tests; the team checks it by hand after each deploy. The A/B suite checks that both variants can be assigned, not the statistical quality of a 50/50 sample, which requires many independent visitors.
- How to run the test suite: Install `requirements-dev.txt`, set `SECRET_KEY` and a PostgreSQL `DATABASE_URL`, then run `ruff check .` and `python manage.py test`. Django creates a separate test database. CI runs the same commands on every pull request.
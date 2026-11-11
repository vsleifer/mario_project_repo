# Grad School Party

Grad School Party is a Yale MGT 656 project. Sprint 1 is a walking skeleton with Django authentication, signup, login/logout, and a protected dashboard backed by PostgreSQL. Minigames, the campus map, AI integration, and leaderboards are not part of this sprint.

## Project Status

- Team nickname: `wandering-shape`
- Framework: Django
- Database: PostgreSQL
- Required A/B test route: `/341e00b`, with public stats at `/341e00b/stats`
- Staging and production URLs: not recorded in this repository; verify and add the public staging URL before Sprint 1 submission
- Team roster and course nicknames: recorded in [`docs/mgt656/team.yaml`](docs/mgt656/team.yaml)

## Local Setup

Requirements: Python 3.10+ and PostgreSQL 13+.

1. Create and activate a virtual environment:

   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```sh
   python -m pip install -r requirements.txt
   ```

3. Create a PostgreSQL database and login. For example, from `psql` as a database administrator:

   ```sql
   CREATE ROLE grad_party_user LOGIN PASSWORD 'choose-a-local-password';
   CREATE DATABASE grad_school_party OWNER grad_party_user;
   ```

4. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the PostgreSQL login you created, generate a unique local `SECRET_KEY`, and adjust the other settings. Generate a key with:

   ```sh
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

   `.env` and `.env.local` are ignored by Git. Never commit them or share their values. Set `DEBUG=False` and a production-only secret in deployment, and set `ALLOWED_HOSTS` to the deployed hostnames.

5. Apply Django's built-in migrations and start the development server:

   ```sh
   python manage.py migrate
   python manage.py runserver 0.0.0.0:${PORT:-8000}
   ```

   Open `http://localhost:8000/341e00b` for the public A/B test. Create an account at `/signup/`; the dashboard is available after login.

## Grader Accounts

Set `GRADER_ACCOUNTS_JSON` in the local ignored `.env` or your deployment provider's secret environment settings. Its value must be a JSON list, for example:

```text
GRADER_ACCOUNTS_JSON=[{"username":"grader-one","password":"use-a-unique-password"}]
```

Then run:

```sh
python manage.py create_fake_graders
```

The command uses Django's password hashing, never prints passwords, and skips usernames that already exist, so rerunning it is safe. Existing account passwords are not changed.

## Tests

Run the test suite against the PostgreSQL database configured by `DATABASE_URL`:

```sh
python manage.py test
```

The tests cover signup, login/logout, dashboard access control, user persistence, and repeatable grader creation. Django creates and removes a separate test database automatically.

## Deployment

Provide `SECRET_KEY`, `DATABASE_URL`, `DEBUG=False`, and comma-separated `ALLOWED_HOSTS` as environment variables in the hosting provider. Set `PORT` if the provider supplies one. Install from `requirements.txt`, run `python manage.py migrate` and `python manage.py collectstatic --noinput` as release steps, and start the web process with the included `Procfile` (Gunicorn binds to `0.0.0.0:$PORT`). Use a TLS-enabled PostgreSQL URL in production. Staging and production should use separate databases and public URLs.

## Working Agreement

The GitHub Project board is the source of truth for the backlog and sprint commitments. Each backlog issue should be labeled `user story`, use the form “As a ..., I want ..., so that ...”, and include testable acceptance criteria. Split stories into sub-issues when they require several independent pieces of work.

At the start of each sprint, assign committed stories to that sprint's iteration. Move unfinished work to a later iteration rather than deleting it. Work on branches; open pull requests that reference the issue with `Closes #<issue>`, describe what the coding agent produced and what the team changed or rejected, and get a teammate's review before merging. Do not use story points, velocity, or burndown charts.

For AI-assisted work, give the agent the acceptance criteria and relevant project context, review the resulting code, and run the appropriate tests before merging. Tests must mock the LLM and other external services; they must not make real external calls.

## A/B Test

The team nickname is `wandering-shape`. Hashing it without a trailing newline gives the required public route `/341e00b`:

```sh
printf %s wandering-shape | shasum
```

The app serves the public A/B page at `/341e00b` and its JSON results at `/341e00b/stats`. The implementation keeps a random `kudos` or `thanks` variant in the visitor's session, stores at most one impression and click per visitor with timestamps, and calculates the preferred variant from database counts. `core.tests.ABTestPageTests` covers the route hash, public page, stable variants, event counts, and stats response. These local tests do not confirm a staging deployment.

## Course Documentation

Keep the required project evidence under [`docs/mgt656/`](docs/mgt656/):

- `team.yaml`: framework, database, and member roster.
- `technical.md`: technical-challenge choices and testing strategy.
- `sprints/sprint-1.md` through `sprint-4.md`: reports on shipped work, staging status, agent experience, and backlog changes.
- `retrospective.md`: final lessons from the project.

Fill each report with links to real issues and merged pull requests. Record what works on staging, not merely what was planned. Do not invent progress or credentials in these documents.

## Submission Checklist

- [ ] Complete the framework, database, team member nicknames, and public URLs.
- [ ] Verify app features, migrations, repeatable seed command, and grader accounts.
- [ ] Verify automated tests run without real LLM or other external-service calls.
- [ ] Verify the public A/B page and stats endpoint, including visitor-level counting and variant persistence.
- [ ] Complete each sprint report, `technical.md`, and the final retrospective.
- [ ] Keep staging/production access details and passwords out of this README and source control.

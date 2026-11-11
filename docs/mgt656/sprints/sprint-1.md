# Sprint 1 Report

**Deadline:** Wednesday, November 11, 2026  
**Sprint goal:** Deliver the Django walking skeleton on staging: user accounts, PostgreSQL-backed A/B test, repeatable grader seed, and a story-driven backlog.

## Shipped

- Django's standard authentication supports signup, login, logout, and a login-protected dashboard. The app reads its database and secrets from environment variables, and its `Procfile` binds Gunicorn to the provider's `PORT`.
- `python manage.py create_fake_graders` reads `GRADER_ACCOUNTS_JSON`, skips existing usernames, and does not replace existing passwords. Its repeatability is covered by a local test. On staging, a grader account with fake data and a throwaway password exists, and the team logged in with it ([#9](https://github.com/vsleifer/mario_project_repo/issues/9)). Grader credentials are kept in Render's environment settings and the submission notes, never in git.
- The public A/B page is implemented at [`/341e00b`](../../../core/urls.py), with JSON statistics at `/341e00b/stats`. Session variants persist across reloads; impressions and clicks are timestamped database events constrained to one of each kind per visitor.
- All 12 Django tests passed locally using a temporary SQLite database. They cover authentication, grader seeding, and A/B behavior; this run does not verify the staging database engine.
- The A/B story [#11](https://github.com/vsleifer/mario_project_repo/issues/11) was closed by merged [PR #5](https://github.com/vsleifer/mario_project_repo/pull/5). The other Sprint 1 stories, [#6](https://github.com/vsleifer/mario_project_repo/issues/6), [#7](https://github.com/vsleifer/mario_project_repo/issues/7), [#8](https://github.com/vsleifer/mario_project_repo/issues/8), [#9](https://github.com/vsleifer/mario_project_repo/issues/9), and [#10](https://github.com/vsleifer/mario_project_repo/issues/10), are done and closed. Documentation and setup notes were merged in [PR #4](https://github.com/vsleifer/mario_project_repo/pull/4).

## Staging

Staging is at [grad-school-party-staging.onrender.com](https://grad-school-party-staging.onrender.com). The login page, [`/341e00b`](https://grad-school-party-staging.onrender.com/341e00b), and [`/341e00b/stats`](https://grad-school-party-staging.onrender.com/341e00b/stats) returned HTTP 200; stats returned the expected JSON shape. A cookie-preserving HTTP check confirmed one A/B button, all four nicknames, a stable variant across reloads, and the variant preserved through the CSRF-protected click redirect. Local tests verify the one-click-per-visitor constraint. The grader account logs in to the dashboard on staging.

## Working with coding agents

For PR #5, the agent produced the A/B model, view, template, migration, and tests. The PR called out that the migration must run on Render before the page can work; the team should verify this deployment step rather than relying only on local tests.

## Next sprint backlog

The Project board assigns [#12](https://github.com/vsleifer/mario_project_repo/issues/12) (profile/avatar), [#13](https://github.com/vsleifer/mario_project_repo/issues/13) (campus map), and [#14](https://github.com/vsleifer/mario_project_repo/issues/14) (first minigame) to Sprint 2. Carry forward any other unfinished Sprint 1 work rather than deleting it.
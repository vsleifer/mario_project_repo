# Sprint 1 Report

**Deadline:** Wednesday, November 11, 2026  
**Sprint goal:** Get the Django application, database-backed A/B test, and grader-account seed workflow working end to end as the team's walking skeleton.

## Shipped

- The repository contains a Django application configured for PostgreSQL through `DATABASE_URL`, with secrets and runtime settings supplied through environment variables. The `Procfile` binds Gunicorn to the provider's `PORT`.
- Django's standard authentication supports signup, login, logout, and a login-protected dashboard.
- `python manage.py create_fake_graders` creates accounts from `GRADER_ACCOUNTS_JSON`, skips existing usernames, and does not replace existing passwords.
- The public A/B page is implemented at [`/341e00b`](../../../core/urls.py), with JSON statistics at `/341e00b/stats`. Session variants persist across reloads; impressions and clicks are timestamped database events constrained to one of each kind per visitor.
- All 12 Django tests passed locally using a temporary SQLite database. The suite covers authentication, repeatable grader seeding, the A/B page and stats behavior. It does not verify a hosted PostgreSQL deployment.
- Closed issue and merged pull request links are not recorded in the repository. Add the real team-project and pull request links here before submission.

## Staging

No public staging URL or deployment evidence is recorded in the repository, so staging behavior cannot be confirmed and the staging requirement is not claimed as complete. After deployment, add the public app URL here and verify login, the seeded grader accounts, `/341e00b`, and `/341e00b/stats` against the staging database.

## Working with coding agents

The README incorrectly said the A/B page was not implemented and that the member nicknames were still missing. Checking the route, view, template, roster, and tests before changing code exposed that documentation drift; the README was corrected instead of duplicating working features.

## Next sprint backlog

No GitHub Project issues or iteration assignments are linked from the repository, so the committed Sprint 2 stories cannot be verified here. Add links to the actual prioritized user stories and move any unfinished Sprint 1 stories into the next iteration without deleting them.
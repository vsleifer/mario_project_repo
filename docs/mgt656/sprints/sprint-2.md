# Sprint 2 Report

**Deadline:** Wednesday, November 18, 2026  
**Sprint goal:** Turn the walking skeleton into the start of the game: players pick a home school and avatar, see a campus map of the six schools, and get a first AI feature, with a separate public production environment.

## Shipped

- **Home school and avatar** ([#12](https://github.com/vsleifer/mario_project_repo/issues/12), closed): signup asks for one of six schools and one of six avatars, saved in a new `Profile` model; players can change both at `/profile/`. Merged in [PR #16](https://github.com/vsleifer/mario_project_repo/pull/16).
- **Campus map hub** ([#13](https://github.com/vsleifer/mario_project_repo/issues/13), closed): the dashboard shows six school tiles in a responsive grid, marks the home school, and shows the player's credits per school from a new `GameScore` model. Each tile opens a placeholder `/play/<school>/` page. Also merged in [PR #16](https://github.com/vsleifer/mario_project_repo/pull/16).
- **AI feature started: "Ask the Dean"** (TODO: link the AI user story issue and its PR). A logged-in player clicks "Get a tip" on the dashboard; the server sends their home school, avatar, and credits to an LLM through OpenRouter and shows a short tip about which school to visit next. The key stays in the `OPENROUTER_API_KEY` environment variable and the browser never calls OpenRouter. Tips are stored in the database, each player gets at most five per 24 hours, and a missing key, timeout, or bad reply shows "The Dean is out of the office" instead of an error.
- The test suite grew from 12 to 32 tests, covering profiles, the map, and the advisor. All OpenRouter calls are mocked.

## Staging and production

Staging: [grad-school-party-staging.onrender.com](https://grad-school-party-staging.onrender.com). Signup with school and avatar is live, `/profile/` and `/play/<school>/` require login, and the A/B page and `/341e00b/stats` return 200. TODO before submitting: log in with the grader account to confirm the campus map loads (that confirms migration `0002` ran on Render), and confirm "Get a tip" works once `OPENROUTER_API_KEY` is set.

Production: TODO: add the URL once deployed. It is a separate Render service with its own Neon database, deployed from `main`, with its own `SECRET_KEY` and grader accounts created by `create_fake_graders`.

## Working with coding agents

For PR #16 the agent wrote the models, forms, views, templates, CSS, migration, and tests, and all tests passed. In review the team still found three problems the tests had missed: a template tag that wasn't loaded inside an `{% include %}`, an outdated Sprint 1 signup test, and password help text styled in red so it looked like an error. Passing tests weren't enough, so (TODO: confirm with the team) before merging we now also click through the changed pages in a browser, on a phone-sized window too. For the AI feature we gave the agent the rule that tests must never call the real LLM, and asked for tests of each failure path (no key, timeout, bad response, daily limit).

## Next sprint backlog

- [#14](https://github.com/vsleifer/mario_project_repo/issues/14) (first playable minigame with a saved score) was not finished and moves to the Sprint 3 iteration. `GameScore` and the `/play/<school>/` route are already in place for it.
- The AI story continues in Sprint 3: TODO: link follow-up issues (for example, making the Dean's tip reflect minigame results once #14 ships).
- Technical-challenge work starts in Sprint 3: TODO: link the stories the team picks (for example, CI on pull requests and a health-check endpoint).

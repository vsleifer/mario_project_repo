# Sprint 2 Report

**Deadline:** Wednesday, November 18, 2026  
**Sprint goal:** Turn the walking skeleton into the start of the game: players pick a home school and avatar, explore a map of Yale's campus in New Haven, play the first minigame, and get a first AI feature, with a separate public production environment.

## Shipped

- **Home school and avatar** ([#12](https://github.com/vsleifer/mario_project_repo/issues/12), closed): signup asks for one of six schools and one of six avatars, saved in a `Profile` model; players can change both at `/profile/`. Merged in [PR #16](https://github.com/vsleifer/mario_project_repo/pull/16).
- **Campus map hub** ([#13](https://github.com/vsleifer/mario_project_repo/issues/13), closed): the dashboard shows the six schools and the player's credits at each, from a `GameScore` model. Merged in [PR #16](https://github.com/vsleifer/mario_project_repo/pull/16). In [PR #18](https://github.com/vsleifer/mario_project_repo/pull/18) the grid of boxes became an illustrated map of central New Haven, with each school's pin at its real building (Evans Hall, Kroon Hall, 127 Wall St, the University Theatre, Green Hall, and 333 Cedar St). The boxes stay below the map as a list that is easy to tap on a phone.
- **First minigame: Law School "Library Stack"** ([#14](https://github.com/vsleifer/mario_project_repo/issues/14), closed by [PR #18](https://github.com/vsleifer/mario_project_repo/pull/18)). In 45-second rounds in the law library, the player drops casebooks onto a growing pile with Space or a tap. Overhanging pages fall off, a perfectly lined-up book scores double, and missing the pile ends the round. The final score is POSTed to `/play/law/score/`, where the server rejects anything that isn't a whole number from 0 to 100. Valid scores are saved with the user, school, and time, and count as Law credits on the map. Code: `static/js/law_stack.js`, `core/minigames.py`, `submit_score` in `core/views.py`.
- **AI feature started: "Ask the Dean"** ([#20](https://github.com/vsleifer/mario_project_repo/issues/20)), merged in [PR #17](https://github.com/vsleifer/mario_project_repo/pull/17). "Get a tip" on the dashboard has the server send the player's home school, avatar, and credits to an LLM through OpenRouter and shows a short tip about which school to visit next. The key stays in `OPENROUTER_API_KEY` and the browser never calls OpenRouter. Tips are stored in the database, each player gets at most five per 24 hours, and a missing key, timeout, or bad reply shows "The Dean is out of the office" instead of an error. PRs #17 and #18 were merged before a teammate reviewed them because of the deadline; reviews are requested after the merge.
- The test suite grew from 12 to 40 tests, covering profiles, the map, the score endpoint's range and CSRF checks, and the advisor. All OpenRouter calls are mocked.

## Staging and production

Staging: [grad-school-party-staging.onrender.com](https://grad-school-party-staging.onrender.com). Signup with school and avatar works, `/profile/`, `/play/<school>/`, and `/advisor/tip/` require login, and the A/B page and `/341e00b/stats` return 200. The minigame and advisor routes are deployed and require login. TODO before submitting: log in with the grader account and confirm that the New Haven map loads, a Library Stack round saves its score, and "Get a tip" returns a tip (this needs `OPENROUTER_API_KEY` set on Render).

Production: TODO: add the URL. It is a separate Render service with its own Neon database, deployed from `main`, with its own `SECRET_KEY` and grader accounts created by `create_fake_graders`.

## Working with coding agents

For PR #16 the agent wrote the models, forms, views, templates, CSS, migration, and tests, and all tests passed. Review still found three problems the tests had missed: a template tag that wasn't loaded inside an `{% include %}`, an outdated Sprint 1 signup test, and password help text styled red so it looked like an error. So for PR #18 we had the agent run the app and play the game in a browser, at desktop and phone sizes, before opening the PR. That caught street labels hidden under school pins on the map. Checking the test count caught a second problem: the agent had named a new test class `CampusMapTests`, the same as an existing one, which silently hid four tests (36 ran instead of 40). We now check that the reported test count matches the number of tests written, not just that the run says OK.

## Next sprint backlog

- [#14](https://github.com/vsleifer/mario_project_repo/issues/14) is done for Law. The other schools' games are new stories for Sprint 3 and later: SOM "SOMchella" rhythm game with arrow keys ([#21](https://github.com/vsleifer/mario_project_repo/issues/21)), Environment maple-syrup harvest ([#22](https://github.com/vsleifer/mario_project_repo/issues/22)), a Gryphon's Pub game, filling pints or catching cups sliding down the bar ([#23](https://github.com/vsleifer/mario_project_repo/issues/23)), and Medicine stitch-up or ambulance race ([#24](https://github.com/vsleifer/mario_project_repo/issues/24)). Drama and Art still need ideas.
- AI: make the Dean's tips reflect minigame results now that scores are saved ([#25](https://github.com/vsleifer/mario_project_repo/issues/25)).
- Technical challenge, starting in Sprint 3: CI that runs the tests on every pull request and blocks merging on failure ([#26](https://github.com/vsleifer/mario_project_repo/issues/26)), and a health-check endpoint ([#27](https://github.com/vsleifer/mario_project_repo/issues/27)).
- Before the A/B run after Sprint 4: delete our own test visits from the production A/B data.

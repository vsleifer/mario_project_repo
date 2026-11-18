"""Playable minigames, keyed by location slug (see core/schools.py LOCATIONS).

A place with an entry here gets a real game at /play/<slug>/; the others show
the "under construction" page. `max_score` is the server-side range check: it
sits above the best score an honest round can reach, and anything higher is
rejected. Each comment shows how the ceiling was worked out.

Games other than Law use the shared page `core/games/game.html` and the shared
engine `static/js/minigame.js`; `script` is the game's own file.
"""

MINIGAMES = {
    "law": {
        "title": "Library Stack",
        "template": "core/games/law_stack.html",
        "credits_label": "Law credits",
        # 45 s round; 1 point per book, 2 for a perfect drop; at most ~1 drop/s.
        "max_score": 100,
    },
    "som": {
        "title": "SOMchella",
        "template": "core/games/game.html",
        "script": "js/games/somchella.js",
        "place": "School of Management · Evans Hall courtyard",
        "intro": "The SOMchella main stage is live. Hit each arrow as it reaches the line, using the arrow keys or by tapping its lane. Perfect timing scores more, and a 10-hit streak doubles your points. Pressing when there's no arrow costs a point.",
        "controls": "Use ← ↓ ↑ → or tap the lanes.",
        "over_title": "That's a wrap on the set",
        "credits_label": "SOM credits",
        "has_sound": True,
        # 40 s of music at 120 bpm: at most 80 notes, at most 2 points x2 streak = 4 each.
        "max_score": 320,
    },
    "environment": {
        "title": "Sugarbush",
        "template": "core/games/game.html",
        "script": "js/games/sugarbush.js",
        "place": "School of the Environment · Yale-Myers Forest",
        "intro": "Sap is running in the sugar maples. Tap a bucket to collect it: fuller buckets earn more syrup, but a bucket that overflows spills everything. You have 45 seconds.",
        "controls": "Tap or click a bucket, or press keys 1–5.",
        "over_title": "Sap season's over",
        "credits_label": "Environment credits",
        # 5 trees; fastest fill is ~1.9 s per bucket; 3 points per full bucket:
        # 45 / 1.9 x 3 x 5 ~ 355.
        "max_score": 400,
    },
    "gryphons": {
        "title": "Last Call at Gryphon's",
        "template": "core/games/game.html",
        "script": "js/games/gryphons.js",
        "place": "Gryphon's Pub · Hall of Graduate Studies",
        "intro": "Round 1 (20 seconds): hold to pour, and let go right at the line for a perfect pint. Round 2 (25 seconds): cups come sliding down the bar, so move to catch them before they fly off the end.",
        "controls": "Round 1: hold Space or press and hold. Round 2: ← → or tap a lane.",
        "over_title": "Last call!",
        "credits_label": "social credits",
        # Pour: >= ~1.8 s per pint, 5 points max -> ~55. Slide: <= ~1.6 cups/s
        # for 25 s, 1 point each -> ~40. Total ~95.
        "max_score": 150,
    },
    "medicine": {
        "title": "Suture Lab",
        "template": "core/games/game.html",
        "script": "js/games/suture.js",
        "place": "School of Medicine · Simulation Center",
        "intro": "Practice your stitches on a suture pad. Drag the needle through each dot in order. Landing close to the center scores double, and finishing an incision earns a bonus. You have 45 seconds.",
        "controls": "Drag with your mouse or finger.",
        "over_title": "Scrubbing out",
        "credits_label": "Medicine credits",
        # Each incision: <= 9 stitches x 2 + 5 bonus = 23; a very fast hand
        # needs ~1.5 s plus the 0.8 s pause: 45 / 2.3 x 23 ~ 450.
        "max_score": 600,
    },
}

"""Playable minigames, keyed by school slug.

A school with an entry here gets a real game at /play/<school>/; the others
show the "under construction" page. `max_score` is the server-side range
check: no honest round can score more, so higher submissions are rejected.
"""

MINIGAMES = {
    "law": {
        "title": "Library Stack",
        "template": "core/games/law_stack.html",
        # A round lasts 45 seconds; each book is worth 1, or 2 for a perfect
        # drop. A player can drop at most about one book per second, so 100
        # is a generous ceiling.
        "max_score": 100,
    },
}

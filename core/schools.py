"""The six Yale schools in the game, and the avatars a player can pick.

Keep these lists as the single source of truth: profile choices, the campus
map, and minigame routes all read from here.
"""

# (slug, display name). The slug is stored in the database and used in URLs.
SCHOOLS = [
    ("som", "SOM"),
    ("medicine", "Medicine"),
    ("art", "Art"),
    ("law", "Law"),
    ("environment", "Environment"),
    ("drama", "Drama"),
]

SCHOOL_NAMES = dict(SCHOOLS)

# (slug, label, emoji). Emoji keep the set fixed without shipping image assets.
AVATARS = [
    ("owl", "Owl", "🦉"),
    ("fox", "Fox", "🦊"),
    ("bulldog", "Bulldog", "🐶"),
    ("cat", "Cat", "🐱"),
    ("robot", "Robot", "🤖"),
    ("astronaut", "Astronaut", "🧑‍🚀"),
]

AVATAR_CHOICES = [(slug, label) for slug, label, _ in AVATARS]
AVATAR_EMOJI = {slug: emoji for slug, _, emoji in AVATARS}

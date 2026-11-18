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

# Where each school sits on the dashboard's illustrated New Haven map
# (SVG viewBox 0 0 800 560, north up). Positions follow the real buildings:
#   SOM: Evans Hall, 165 Whitney Ave      Environment: Kroon Hall, 195 Prospect St
#   Law: 127 Wall St                      Drama: University Theatre, 222 York St
#   Art: Green Hall, 1156 Chapel St       Medicine: 333 Cedar St
# `label` is where the name tag sits relative to the pin: "left" or "right".
MAP_PINS = {
    "som": {"x": 600, "y": 128, "label": "right"},
    "environment": {"x": 470, "y": 86, "label": "left"},
    "law": {"x": 352, "y": 222, "label": "left"},
    "drama": {"x": 228, "y": 344, "label": "left"},
    "art": {"x": 262, "y": 418, "label": "right"},
    "medicine": {"x": 170, "y": 506, "label": "right"},
}

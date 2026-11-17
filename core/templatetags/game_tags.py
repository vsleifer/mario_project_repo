from django import template

from core.schools import AVATAR_EMOJI

register = template.Library()


@register.filter
def avatar_emoji(slug):
    return AVATAR_EMOJI.get(slug, "")

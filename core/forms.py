from django import forms
from django.contrib.auth.forms import UserCreationForm

from .models import Profile
from .schools import AVATAR_CHOICES, SCHOOLS


class ProfileForm(forms.ModelForm):
    home_school = forms.ChoiceField(choices=SCHOOLS, widget=forms.RadioSelect, label="Home school")
    avatar = forms.ChoiceField(choices=AVATAR_CHOICES, widget=forms.RadioSelect)

    class Meta:
        model = Profile
        fields = ["home_school", "avatar"]


class SignupForm(UserCreationForm):
    """Django's signup form plus home school and avatar, saved together."""

    home_school = forms.ChoiceField(choices=SCHOOLS, widget=forms.RadioSelect, label="Home school")
    avatar = forms.ChoiceField(choices=AVATAR_CHOICES, widget=forms.RadioSelect)

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            Profile.objects.create(
                user=user,
                home_school=self.cleaned_data["home_school"],
                avatar=self.cleaned_data["avatar"],
            )
        return user

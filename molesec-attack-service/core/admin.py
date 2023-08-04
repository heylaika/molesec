import json

from django import forms
from django.contrib import admin
from django.contrib.contenttypes.admin import GenericStackedInline
from django.db.models import JSONField
from django.forms import widgets
from django.shortcuts import redirect
from django.urls import reverse

from core.attack_agent.phishing_emails import regenerate_email
from core.models import (
    Attack,
    AttackArtifact,
    AttackArtifactStatus,
    AttackLog,
    Objective,
    PhishingEmail,
)


class ObjectiveAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "org_id",
        "begins_at",
        "expires_at",
        "target_emails",
        "status",
    ]
    list_filter = ["status"]
    search_fields = ["org_id"]


admin.site.register(Objective, ObjectiveAdmin)


class AttackAdmin(admin.ModelAdmin):
    list_display = ["target_email", "status", "objective"]
    list_filter = ["status"]
    search_fields = ["target_email"]


admin.site.register(Attack, AttackAdmin)


class AttackLogAdmin(admin.ModelAdmin):
    list_display = ["attack", "type", "payload"]
    list_filter = ["type"]
    search_fields = ["payload"]


admin.site.register(AttackLog, AttackLogAdmin)


# The following inline forms are used to show the AttackArtifact of
# each AttackArtifactContent in the admin panel, doing the opposite
# wasn't really playing nice with the GenericForeignKey, but it should
# be doable.


class AttackArtifactAdminInlineForm(forms.ModelForm):
    class Meta:
        model = AttackArtifact
        fields = [
            "status",
        ]
        labels = {
            "status": "Status (set APPROVAL here)",
        }


class AttackArtifactInline(GenericStackedInline):
    form = AttackArtifactAdminInlineForm
    model = AttackArtifact
    extra = 0

    def has_add_permission(self, request, obj) -> bool:
        return False


class FormattedJSONWidget(widgets.Textarea):
    def format_value(self, value):
        value = json.dumps(json.loads(value), indent=1, sort_keys=True)
        # Try to adjust size of TextArea to fit to content.
        row_lengths = [len(r) for r in value.split("\n")]
        self.attrs["rows"] = min(max(len(row_lengths) + 2, 10), 30)
        self.attrs["cols"] = min(max(max(row_lengths) + 2, 40), 120)
        return value


class PhishingEmailAdminForm(forms.ModelForm):
    regenerate = forms.BooleanField(
        label="REGENERATE (click SAVE to regenerate)", required=False
    )

    class Meta:
        model = PhishingEmail
        fields = [
            "sender",
            "subject",
            "recipients",
            "body",
            "generation_parameters",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance.artifact.status != AttackArtifactStatus.UNDER_REVIEW:
            self.fields["regenerate"].widget = forms.HiddenInput()

        self.fields["subject"].widget.attrs.update(
            {
                # "style": "width: 10%",
                "style": "width: 40%;height: 10px",
                "size": 1,
            }
        )

    def save(self, commit=True):
        if self.cleaned_data["regenerate"]:
            regenerate_email(self.instance)

        return super().save(commit=commit)


class PhishingEmailAdmin(admin.ModelAdmin):
    list_display = ["recipients", "status", "created_at"]
    search_fields = ["recipients"]
    form = PhishingEmailAdminForm
    inlines = [
        AttackArtifactInline,
    ]
    can_add_related = False

    formfield_overrides = {JSONField: {"widget": FormattedJSONWidget}}

    def response_change(self, request, obj):
        opts = obj._meta  # pylint: disable=W0212
        self.message_user(request, f"{opts.verbose_name} saved successfully.")
        url = reverse(
            f"admin:{opts.app_label}_{opts.model_name}_change", args=(obj.pk,)
        )
        return redirect(url)


admin.site.register(PhishingEmail, PhishingEmailAdmin)

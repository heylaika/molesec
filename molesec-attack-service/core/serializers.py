from datetime import datetime
from typing import Any, Dict, List, Tuple

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import exceptions as rf_exceptions
from rest_framework import serializers

from core.coordinators import attacks
from core.coordinators.objectives import expire_objective
from core.errors import ApplicationError, ObjectiveExpiredError
from core.models import Attack, AttackLog, Objective, ObjectiveStatus, PhishingEmail
from core.receptionist import process_objective_payload
from core.types import (
    AttackArtifactContentType,
    ErrorCategory,
    ErrorPayload,
    TextGenerationFormalityLevel,
    TextGenerationRequestReason,
    TextGenerationRequestType,
    TextGenerationUrgencyLevel,
)
from core.utils import (
    exception_to_response_data,
    generic_error_payload,
    get_subclasses_and_self,
    validate_dates,
)

error_classes = get_subclasses_and_self(ApplicationError)

error_serializer = inline_serializer(
    name=ErrorCategory.ERROR.value,
    fields={
        "message": serializers.CharField(),
        "data": serializers.DictField(),
        "category": serializers.ChoiceField(choices=[c.value for c in ErrorCategory]),
        "error_code": serializers.ChoiceField(
            choices=[cls.error_code for cls in error_classes]
        ),
    },
)


def _generate_app_error_serializers_and_payloads() -> (
    Tuple[Dict[str, serializers.Serializer], Dict[str, ErrorPayload]]
):
    tmp_error_code_to_serializer = {}
    tmp_error_code_to_example_payload = {}

    for cls in error_classes:
        exc: ApplicationError = cls()
        tmp_error_code_to_example_payload[exc.error_code] = exception_to_response_data(
            exc
        )
        tmp_error_code_to_serializer[exc.error_code] = inline_serializer(
            name=f"ERROR_{exc.error_code}",
            fields={
                "message": serializers.CharField(),
                # Use read only fields instead of ChoiceField because it
                # makes it easier to read in the swagger schema, and it
                # can only assume one value.
                "category": serializers.CharField(
                    default=exc.category.value, read_only=True
                ),
                "error_code": serializers.CharField(
                    default=exc.error_code, read_only=True
                ),
                "data": serializers.DictField(),
            },
        )
    tmp_error_code_to_example_payload[
        generic_error_payload["error_code"]
    ] = generic_error_payload

    tmp_error_code_to_serializer[generic_error_payload["error_code"]] = error_serializer

    # Trigger a validation error to have an example payload for it.
    try:

        class TmpSerializer(serializers.Serializer):
            some_property = serializers.CharField(required=True)

        serializer = TmpSerializer(data={})
        serializer.is_valid(raise_exception=True)
    except rf_exceptions.ValidationError as exception:
        data = exception_to_response_data(exception)
        tmp_error_code_to_example_payload[data["error_code"]] = data
        tmp_error_code_to_serializer[data["error_code"]] = inline_serializer(
            name=f'ERROR_{data["error_code"]}',
            fields={
                "message": serializers.CharField(),
                "data": serializers.DictField(),
                "category": serializers.CharField(
                    default=data["error_code"], read_only=True
                ),
                "error_code": serializers.CharField(
                    default=data["error_code"], read_only=True
                ),
            },
        )

    return tmp_error_code_to_serializer, tmp_error_code_to_example_payload


(
    error_code_to_serializer,
    error_code_to_example_payload,
) = _generate_app_error_serializers_and_payloads()


class GetObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Objective
        exclude = ["id"]


class CreateObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Objective
        fields = ["id", "begins_at", "expires_at", "org_id", "goal", "target_emails"]

    def create(self, validated_data) -> Tuple[Objective, List[Attack]]:
        return process_objective_payload(validated_data)

    def save(self):
        return self.create(self.validated_data)


class UpdateObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Objective
        fields = ["begins_at", "expires_at", "target_emails"]

    def update(self, instance: Objective, validated_data):
        dates = validate_dates(validated_data)

        begins_at = dates.get("begins_at", instance.begins_at)
        expires_at = dates.get("expires_at", instance.expires_at)
        target_emails = validated_data.get("target_emails", instance.target_emails)

        return _update_objective(
            objective=instance,
            begins_at=begins_at,
            expires_at=expires_at,
            target_emails=target_emails,
        )

    def save(self):
        instance = getattr(self, "instance", None)
        if instance is None:
            raise ApplicationError("Objective unavailable.")
        return self.update(instance, self.validated_data)


def _update_objective(
    objective: Objective,
    begins_at: datetime,
    expires_at: datetime,
    target_emails: List[str],
) -> Objective:
    """Update the Objective with the given payload."""
    now = timezone.now()

    _is_valid_update(objective=objective, begins_at=begins_at, now=now)

    with transaction.atomic():
        objective.begins_at = begins_at
        objective.expires_at = expires_at
        if expires_at <= now:
            expire_objective(objective)
        else:
            add_attacks_to_objective(objective, target_emails)
            remove_attacks_from_objective(objective, target_emails)
            objective.target_emails = target_emails
            objective.save(update_fields=["begins_at", "expires_at", "target_emails"])

    return objective


def add_attacks_to_objective(objective: Objective, emails: List[str]):
    """Based on the email list, add new attacks that
    don't exist in the objective yet."""
    targets_to_add = list(set(emails) - set(objective.target_emails))
    attacks.create_attacks_for_objective(objective=objective, emails=targets_to_add)


def remove_attacks_from_objective(objective: Objective, emails: List[str]):
    """Remove existing attacks of emails that don't belong to
    the intended email list.

    """
    targets_to_remove = list(set(objective.target_emails) - set(emails))
    attack_to_remove = Attack.objects.filter(target_email__in=targets_to_remove)
    attack_to_remove.delete()


def _is_valid_update(objective: Objective, begins_at: datetime, now: datetime):
    """Create or remove attacks based on the given list of emails."""
    if objective.status == ObjectiveStatus.EXPIRED or now > objective.expires_at:
        raise ObjectiveExpiredError("Objective has already expired.")

    started = objective.status == ObjectiveStatus.ONGOING or now > objective.begins_at

    if started and begins_at != objective.begins_at:
        message = "Unable to change begins_at of a started objective."
        raise serializers.ValidationError(message)


class AttackLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttackLog
        exclude = ["attack"]


class AttackListItemSerializer(serializers.ModelSerializer):
    logs = AttackLogSerializer(many=True, read_only=True)

    class Meta:
        model = Attack
        exclude = ["objective"]


class AttackDetailsSerializer(AttackListItemSerializer):
    artifacts = serializers.SerializerMethodField()

    @extend_schema_field(
        {
            "type": "object",
            "description": "A list of Attack artifact objects, e.g. emails.",
            "example": [
                {"type": "email", "id": "...", "subject": "...", "body": "..."}
            ],
        }
    )
    def get_artifacts(self, object: Attack):
        artifacts = []
        for artifact in object.artifacts:
            content_type: AttackArtifactContentType = getattr(
                artifact.content_object, "type"
            )
            ArtifactSerializer = artifact_serializers[content_type]
            serializer = ArtifactSerializer(artifact.content_object)
            artifacts.append({"type": content_type, **serializer.data})

        return artifacts


class PhishingEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhishingEmail
        fields = ["id", "subject", "body", "opened_at"]


class StringListSerializer(serializers.ListSerializer):
    child = serializers.CharField()


class OrganizationSerializer(serializers.Serializer):
    class Meta:
        exclude = ["time_created"]

    id = serializers.UUIDField()
    domains = StringListSerializer()
    languages = StringListSerializer()
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    industry = serializers.CharField(
        max_length=255, required=False, allow_blank=True, allow_null=True
    )
    timezone = serializers.CharField(
        max_length=255, required=False, allow_blank=True, allow_null=True
    )


class DevTextGenerationSerializer(serializers.Serializer):
    from_name = serializers.CharField(required=False, allow_null=True)
    from_last_name = serializers.CharField(required=False, allow_null=True)
    to_name = serializers.CharField(required=False, allow_null=True)
    to_last_name = serializers.CharField(required=False, allow_null=True)
    formal_level = serializers.ChoiceField(
        choices=list(TextGenerationFormalityLevel),
        default=TextGenerationFormalityLevel.INFORMAL,
    )
    urgency_level = serializers.ChoiceField(
        choices=list(TextGenerationUrgencyLevel),
        default=TextGenerationUrgencyLevel.NORMAL,
    )
    text_request_type = serializers.ChoiceField(
        choices=list(TextGenerationRequestType),
        default=TextGenerationRequestType.CLICK_LINK,
    )
    text_request_reason = serializers.ChoiceField(
        choices=list(TextGenerationRequestReason),
        default=TextGenerationRequestReason.NOT_WORKING,
    )


class DevSendEmailSerializer(serializers.Serializer):
    from_email = serializers.EmailField(default=settings.DEFAULT_FROM_EMAIL)
    from_name = serializers.CharField(required=False, allow_null=True)
    from_last_name = serializers.CharField(required=False, allow_null=True)
    to_email = serializers.EmailField()
    subject = serializers.CharField()
    body = serializers.CharField()
    is_html = serializers.BooleanField()
    extra_headers = serializers.DictField(required=False, allow_null=True)


artifact_serializers: Dict[AttackArtifactContentType, Any] = {
    "email": PhishingEmailSerializer
}

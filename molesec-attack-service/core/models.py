from uuid import uuid4

from django.conf import settings
from django.contrib import admin
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator
from django.db import models
from django.db.models import QuerySet
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.urls import reverse

from core.types import AttackArtifactContentType


class BaseModel(models.Model):
    class Meta:
        abstract = True

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class ObjectiveStatus(models.TextChoices):
    """The status of an Objective."""

    CREATED = "CREATED"
    ONGOING = "ONGOING"
    EXPIRED = "EXPIRED"


class Goal(models.TextChoices):
    CREDENTIALS = "CREDENTIALS"
    TARGET_CLICKED_ON_LINK = "TARGET_CLICKED_ON_LINK"


class Objective(models.Model):
    """A cherry-picked copy of the Objective in Dashboard."""

    class Meta:
        db_table = "attack_service_objectives"

    # Duplicate the ID of the objective from Dashboard.
    id = models.UUIDField(primary_key=True)

    begins_at = models.DateTimeField(db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    org_id = models.UUIDField(blank=False, db_index=True, db_column="org_id")

    status = models.CharField(
        max_length=20,
        choices=ObjectiveStatus.choices,
        default=ObjectiveStatus.CREATED,
    )

    goal = models.CharField(
        max_length=100,
        choices=Goal.choices,
        default=Goal.CREDENTIALS,
        db_index=True,
    )

    # https://molesecurity.slack.com/archives/C01RKD0EKGU/p1681825264093499?thread_ts=1681743573.327899&cid=C01RKD0EKGU
    # An individual can be part of multiple concurrent campaigns, but
    # can only receive one attack at a time across all campaigns of
    # the organization.
    # Therefore, Objective needs to keep track of the target emails,
    # so that Coordinator can skip a busy target and initiate a new
    # attack if the target is available in future loops.
    target_emails = ArrayField(models.EmailField(blank=False), blank=False)


class AttackStatus(models.TextChoices):
    """The status of an Attack."""

    # Prerequisites:
    #  - not enough data about the target.
    #  - no artifact.
    WAITING_FOR_DATA = "WAITING_FOR_DATA"
    # Prerequisites:
    #  - enough data about the target
    # Actions:
    #  - if Attack has no artifact, create the first artifact.
    #  - [human] user can request extra artifacts with API calls.
    #  - if Attack has approved artifacts, deliver them.
    #  - if any success event received by AttackEventListener,
    #    set status as SUCCESS.
    #  - if the target stops interacting with any sent artifact for N
    #    days, set status as FAILED.
    #  - if the objective has ended, set status as FAILED.
    ONGOING = "ONGOING"
    # The goal of the Attack is not fulfilled.
    FAILED = "FAILED"
    # The goal of the Attack has been accomplished.
    SUCCESS = "SUCCESS"


ActiveAttackStatuses = [AttackStatus.WAITING_FOR_DATA, AttackStatus.ONGOING]

AttackStatusEndStates = [
    AttackStatus.FAILED,
    AttackStatus.SUCCESS,
]


class Attack(BaseModel):
    """An attempt to breach a target."""

    class Meta:
        db_table = "attack_service_attacks"
        constraints = [
            models.UniqueConstraint(
                name="unique_active_attack_on_target_email_and_org_id",
                fields=["target_email", "org_id"],
                condition=~models.Q(status__in=AttackStatusEndStates),
            )
        ]

    id = models.UUIDField(default=uuid4, editable=False, primary_key=True)

    target_email = models.EmailField(max_length=255, null=False)

    status = models.CharField(
        max_length=20,
        choices=AttackStatus.choices,
        default=AttackStatus.WAITING_FOR_DATA,
    )

    @property
    def artifacts(self) -> "QuerySet[AttackArtifact]":
        """The list of AttackArtifacts of the Attack.

        Return all associated AttackArtifacts, ordered by created time.
        """
        artifacts_query_set: "QuerySet[AttackArtifact]" = (
            self.attackartifact_set  # pyright: ignore[reportGeneralTypeIssues]
        )
        # Prefetch to prevent the N + 1 query on content_object.
        artifacts_query_set = (
            artifacts_query_set.prefetch_related("content_type")
            .prefetch_related("content_object")
            .order_by("created_at")
        )
        return artifacts_query_set.all()

    org_id = models.UUIDField(blank=False, db_index=True, db_column="org_id")

    objective = models.ForeignKey(Objective, on_delete=models.CASCADE)

    def clean(self):
        """Ensure that org_id is identical to objective.org_id."""
        if self.objective and self.org_id != self.objective.org_id:
            raise ValidationError("org_id must be identical to objective.org_id")

    def save(self, *args, **kwargs):
        """Manually call full_clean before saving.

        Note that save function is not always called, such as
        bulk_create. Manual checks are needed depending on the
        situation.
        """
        self.full_clean()
        return super().save(*args, **kwargs)


class AttackArtifactStatus(models.TextChoices):
    # Prerequisites:
    #  - artifact is created.
    #  - artifact is not yet approved.
    # Actions:
    #  - [human] if quality is good, set status as APPROVE.
    #    edit or delete the artifact if quality is poor.
    UNDER_REVIEW = "UNDER_REVIEW"
    # Prerequisites:
    #  - artifact is approved.
    # Actions:
    #  - deliver the artifact.
    APPROVED = "APPROVED"


class AttackArtifact(BaseModel):
    """An artifact of an Attack."""

    class Meta:
        db_table = "attack_service_attack_artifacts"
        # Ensure that the associated content object is unique.
        unique_together = ("content_type", "object_id")
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    status = models.CharField(
        max_length=200,
        blank=False,
        null=False,
        choices=AttackArtifactStatus.choices,
        default=AttackArtifactStatus.UNDER_REVIEW,
    )

    id = models.UUIDField(default=uuid4, editable=False, primary_key=True)

    attack = models.ForeignKey(Attack, on_delete=models.CASCADE)

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to={"model__in": ("phishingemail",)},
    )

    object_id = models.UUIDField(db_index=True)

    content_object = GenericForeignKey("content_type", "object_id")

    sent_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_deliverable(self) -> bool:
        """Return True if the artifact can be sent out."""
        return self.status == AttackArtifactStatus.APPROVED and self.sent_at is None


class AttackArtifactContent(BaseModel):
    """Content object of AttackArtifact.

    AttackArtifactContent is associated with AttackArtifact using
    GenericForeignKey, so that AttackArtifact can associate with
    multiple types of content, e.g. PhishingEmail.
    """

    class Meta:
        abstract = True

    id = models.UUIDField(default=uuid4, editable=False, primary_key=True)

    # Assuming that all kinds of content should have a `body` field.
    body = models.TextField()

    artifacts = GenericRelation(
        AttackArtifact,
        content_type_field="content_type",
        object_id_field="object_id",
        related_query_name="content_objects",
    )

    # Parameters with which the content is generated.This allows to
    # review and regenerate the artifact if necessary. And it's
    # especially useful for artifacts which generation is fuzzy (like
    # llm emails). Will break when the arguments of generation change,
    # so logic using this field should always provide defaults.
    generation_parameters = models.JSONField(default=dict, null=False, blank=False)

    @property
    def type(self) -> AttackArtifactContentType:
        raise NotImplementedError("AttackArtifactContent class should have a name.")

    @property
    def artifact(self) -> "AttackArtifact":
        """Return the associated AttackArtifact."""
        return self.artifacts.first()

    @property
    def admin_relative_url(self) -> str:
        """Return the admin panel URL of the content object."""
        return reverse(
            f"admin:{self._meta.app_label}_{self._meta.model_name}_change",
            args=(self.id,),
        )

    @property
    def admin_full_url(self) -> str:
        """Return the full admin panel URL of the content object."""
        return f"{settings.DEFAULT_DOMAIN}{self.admin_relative_url}"

    @admin.display(description="Status")
    def status(self):
        return self.artifact.status


class TokenBasedComponent(BaseModel):
    """Component with a phishing token.

    Phishing tokens are UUIDs that represents a bait, which is used in
    a phishing website link or a phishing SMS link.
    """

    class Meta:
        abstract = True

    token = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(8)],
        db_index=True,
        unique=True,
        blank=True,
    )
    token_consumed_at = models.DateTimeField(null=True, blank=True)


class PhishingEmail(TokenBasedComponent, AttackArtifactContent):
    class Meta:
        db_table = "attack_service_phishing_emails"

    # TODO: move the token to the PhishingToken model?

    subject = models.TextField(blank=False)
    sender = models.EmailField(blank=False)
    recipients = ArrayField(models.EmailField(blank=False), blank=False)

    is_html = models.BooleanField(default=True)

    opened_at = models.DateTimeField(null=True, blank=True)

    @property
    def type(self) -> AttackArtifactContentType:
        return "email"


class TokenType(models.TextChoices):
    CREDENTIALS = "CREDENTIALS"


class PhishingToken(TokenBasedComponent):
    """General purpose model for phishing tokens."""

    class Meta:
        db_table = "attack_service_phishing_tokens"

    type = models.CharField(
        max_length=200, blank=False, null=False, choices=TokenType.choices
    )

    attack_artifact = models.ForeignKey(
        AttackArtifact, on_delete=models.CASCADE, related_name="tokens"
    )


artifact_types = [PhishingEmail]


class AttackLogType(models.TextChoices):
    CREDENTIALS_SUBMITTED = "CREDENTIALS_SUBMITTED"
    EMAIL_SENT = "EMAIL_SENT"
    EMAIL_OPENED = "EMAIL_OPENED"
    LINK_CLICKED = "LINK_CLICKED"


class AttackLog(BaseModel):
    """The history of user-facing state changes of an Attack."""

    class Meta:
        db_table = "attack_service_attack_logs"

    id = models.UUIDField(default=uuid4, editable=False, primary_key=True)

    type = models.CharField(
        max_length=200, blank=False, null=False, choices=AttackLogType.choices
    )

    payload = models.JSONField(blank=True, null=True)

    attack = models.ForeignKey(Attack, on_delete=models.CASCADE, related_name="logs")


@receiver(post_delete, sender=AttackArtifact)
def delete_artifact_content(sender, instance, **kwargs):
    """Delete the content associated with the AttackArtifact.

    The content object is associated with AttackArtifact via
    GenericForeignKey, and cannot be deleted via
    `on_delete: models.CASCADE`. Use this signal to delete it manually.

    Note: "pre_delete" will lead to `maximum recursion depth exceeded`
    error.
    """
    if isinstance(instance, AttackArtifact):
        content_object = instance.content_object
        for artifact_type in artifact_types:
            if isinstance(content_object, artifact_type):
                content_object.delete()
                break

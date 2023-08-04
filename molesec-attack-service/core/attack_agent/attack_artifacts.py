import logging
from enum import Enum
from typing import List

from django.conf import settings
from django.db import transaction

from core import types as core_types
from core import utils as core_utils
from core.attack_agent import deploy
from core.attack_agent.phishing_emails import create_phishing_email
from core.models import (
    Attack,
    AttackArtifact,
    AttackArtifactContent,
    AttackArtifactStatus,
    Goal,
)


class ArtifactContentType(str, Enum):
    EMAIL = "EMAIL"


def create_attack_artifact_content(
    attack: Attack, type: ArtifactContentType
) -> AttackArtifactContent:
    """Create AttackArtifactContent based on the given type."""
    if type != ArtifactContentType.EMAIL:
        raise ValueError("Unknown Artifact content type.")

    goal_to_request_type = {
        Goal.TARGET_CLICKED_ON_LINK: core_types.TextGenerationRequestType.CLICK_LINK,
        Goal.CREDENTIALS: core_types.TextGenerationRequestType.LOOK_INTO_THIS,
    }
    request_type = goal_to_request_type[attack.objective.goal]

    return create_phishing_email(attack, request_type=request_type)


def _request_artifact_approval(artifact: AttackArtifact) -> None:
    """Requests approval through the admin panel."""
    content_type = artifact.content_type.name
    msg = "\n".join(
        [
            f"New *{content_type}* artifact created, please *review*: "
            f"{artifact.content_object.admin_full_url}",
        ]
    )
    if settings.DEBUG:
        logging.info(msg)

    else:
        core_utils.send_slack_message(msg)


def create_attack_artifact(
    attack: Attack,
    content_type: ArtifactContentType = ArtifactContentType.EMAIL,
):
    """Creates an AttackArtifact and its content."""

    with transaction.atomic():
        content_object = create_attack_artifact_content(attack, content_type)
        artifact = AttackArtifact.objects.create(
            attack=attack, content_object=content_object
        )
        if artifact.status == AttackArtifactStatus.UNDER_REVIEW:
            _request_artifact_approval(artifact)
        return artifact


def deliver_artifacts(artifacts: List[AttackArtifact]):
    """Send out deliverable artifacts."""
    deliverables = [artifact for artifact in artifacts if artifact.is_deliverable]

    for artifact in deliverables:
        deploy(artifact)

    return deliverables


__all__ = ["create_attack_artifact", "deliver_artifacts"]

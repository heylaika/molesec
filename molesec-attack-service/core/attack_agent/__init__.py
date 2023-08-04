"""Attack agent.

The Attack Agent, as a concept, is responsible for carrying out
the attacking activities during an attack on a target. For instance,
in an attack on John, the Attack Agent can be used to generate
phishing emails as artifacts and send them to John.

"""

from django.utils import timezone

from core import attack_logger
from core.attack_agent.phishing_emails import send_phishing_email
from core.models import AttackArtifact, PhishingEmail


def deploy(artifact: AttackArtifact) -> None:
    """Deploy the artifact if it's deliverable."""

    if not artifact.is_deliverable:
        return

    if isinstance(artifact.content_object, PhishingEmail):
        send_phishing_email(artifact.content_object)
        attack_logger.log_email_sent(artifact)

    artifact.sent_at = timezone.now()
    artifact.save()


__all__ = ["deploy"]

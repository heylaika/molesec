"""Tiny abstraction to uniformly log attack events."""


from core import models as core_models


def _create_attack_log(
    log_type: core_models.AttackLogType,
    attack_artifact: core_models.AttackArtifact,
):
    attack = attack_artifact.attack
    content_object = attack_artifact.content_object

    # Remove all the escaped characters.
    body: str = getattr(content_object, "body").replace("\n", " ").replace("\r", "")
    excerpt = body[:49] + "…" if len(body) > 50 else body

    payload = {
        "artifact": {
            "id": str(getattr(content_object, "id")),
            "type": getattr(content_object, "type"),
            "excerpt": excerpt,
        }
    }

    core_models.AttackLog.objects.create(type=log_type, attack=attack, payload=payload)


def log_email_sent(attack_artifact: core_models.AttackArtifact):
    _create_attack_log(core_models.AttackLogType.EMAIL_SENT, attack_artifact)


def log_email_opened(attack_artifact: core_models.AttackArtifact):
    _create_attack_log(core_models.AttackLogType.EMAIL_OPENED, attack_artifact)


def log_link_clicked(attack_artifact: core_models.AttackArtifact):
    _create_attack_log(core_models.AttackLogType.LINK_CLICKED, attack_artifact)


def log_credentials_submitted(attack_artifact: core_models.AttackArtifact):
    _create_attack_log(core_models.AttackLogType.CREDENTIALS_SUBMITTED, attack_artifact)


# Export all log_* functions.
__all__ = [
    "log_email_sent",
    "log_email_opened",
    "log_link_clicked",
    "log_credentials_submitted",
]

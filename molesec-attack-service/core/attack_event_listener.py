"""Attack event listener.

The AttackEventListener, as a concept, is in charge of keeping track of
external events of the attack, i.e. the interaction that outside
entities, like people, do with our system. For example opening an email,
clicking a link, submitting a form, etc.

This module is, in a sense, both sync and async. The sync parts will be
the ones related to persisting things like interactions with our API,
while the async parts could be, for example, checking an email inbox
periodically.

"""
import logging

from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone

from core import attack_logger as at_logger
from core.coordinators.attacks import set_success_attack
from core.errors import ApplicationError
from core.models import AttackStatus, Goal, PhishingEmail, PhishingToken


def consume_email_phishing_token(email: PhishingEmail, token: str) -> None:
    """Consumes an email phishing token."""
    logging.info(f"Consuming token {token}")
    email.token_consumed_at = timezone.now()
    email.save(update_fields=["token_consumed_at"])


def consume_phishing_token(token: PhishingToken) -> None:
    """Consumes a phishing token."""
    logging.info(f"Consuming token {token.token}")
    token.token_consumed_at = timezone.now()
    token.save(update_fields=["token_consumed_at"])


def record_token_consumed(token: str) -> None:
    """Records a token being consumed."""

    # A bit of an hacky way to unify the functionality exposed to the
    # other modules, imo we should move the ad hoc token out of the
    # email model in favour of general purpose ones.
    try:
        _record_phishing_link_clicked(token)
    except Http404:
        ...

    try:
        _record_credentials_submitted(token)
    except Http404:
        ...


def _record_phishing_link_clicked(token: str) -> None:
    """Records a phishing link (token based) click."""

    email = get_object_or_404(PhishingEmail, token=token)

    logging.info(f'Phishing link with token "{token}" clicked.')
    attack = email.artifact.attack

    if attack.status != AttackStatus.ONGOING or email.token_consumed_at is not None:
        logging.info(f'Token "{token}" has already been used. Ignore.')
        return

    with transaction.atomic():
        consume_email_phishing_token(email, token)
        # TODO.
        if attack.objective.goal == Goal.TARGET_CLICKED_ON_LINK:
            set_success_attack(attack)
        at_logger.log_link_clicked(email.artifact)


def receive_email_opened_event(email_id: str) -> None:
    """Records an email opened event."""

    email = get_object_or_404(PhishingEmail, id=email_id)

    logging.info(f'Phishing email with ID "{email_id}" is opened.')
    attack = email.artifact.attack

    if email.artifact.sent_at is None:
        raise ApplicationError(f"Email {email.id} is not yet sent.")

    if attack.status != AttackStatus.ONGOING or email.opened_at is not None:
        logging.info(f'Email with ID "{email_id}" has been opened. Ignore.')
        return

    with transaction.atomic():
        email.opened_at = timezone.now()
        email.save()
        at_logger.log_email_opened(email.artifact)


def _record_credentials_submitted(token: str) -> None:
    """Records some credentials being submitted."""

    token_obj = get_object_or_404(PhishingToken, token=token)

    logging.info(f'Credentials with token "{token}" submitted.')
    attack = token_obj.attack_artifact.attack

    if attack.status != AttackStatus.ONGOING or token_obj.token_consumed_at is not None:
        logging.info(f'Token "{token}" has already been used. Ignore.')
        return

    with transaction.atomic():
        consume_phishing_token(token_obj)
        # TODO.
        if attack.objective.goal == Goal.CREDENTIALS:
            set_success_attack(attack)
        at_logger.log_credentials_submitted(token_obj.attack_artifact)


__all__ = [
    "_record_phishing_link_clicked",
    "receive_email_opened_event",
    "_record_credentials_submitted",
]

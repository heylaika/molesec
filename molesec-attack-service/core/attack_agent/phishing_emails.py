import html
import logging
import random
from typing import List, Optional, Tuple
from uuid import uuid4

from django.conf import settings
from django.template.loader import render_to_string
from django.urls import reverse
from pydantic import UUID4, EmailStr

from core import text_generation
from core import types as core_types
from core.errors import ApplicationError
from core.models import Attack, Goal, PhishingEmail, TokenType
from core.profile_data import get_profile_data
from core.types import Email, Individual, ProfileData
from core.utils import emails as email_utils
from core.utils import with_default
from core.utils.emails import send_or_insert_email


def _phishing_token_url(token: str) -> str:
    """Return the phishing token URL."""
    path = reverse("phi-access")
    return f"{settings.DEFAULT_DOMAIN}{path}?at={token}"


def _github_login_url(token: str, credentials_token: str) -> str:
    path = reverse("phi-login")
    return f"{settings.GITHUB_PHISHING_DOMAIN}{path}?at={token}&ct={credentials_token}"


def _tracking_pixel_url(email_id: UUID4) -> str:
    """Return the phishing token URL."""
    path = reverse("phi-tracking-pixel")
    return f"{settings.DEFAULT_DOMAIN}{path}?id={email_id}"


def extract_profiles(attack: Attack) -> Tuple[Optional[Individual], ProfileData]:
    """Extract the impersonated individual and the target personal data.

    Note that here we're assuming ProfileData for the given target is
    passing the criteria (so that attack status was set to ONGOING).
    If profile data is None at this stage, it should rightfully raise
    an error due to upstream issues.
    """
    profile_data = get_profile_data(
        attack.objective.org_id, EmailStr(attack.target_email)
    )

    if profile_data is None:
        raise ApplicationError(
            "Profile data unavailable while attack status is ONGOING."
        )

    peers = profile_data.peers
    impersonated_individual = random.choice(peers) if peers else None

    return impersonated_individual, profile_data


def _pick_target_email(emails: List[Email]) -> EmailStr:
    for email in emails:
        if email_utils.supports_insertion(email.value):
            return email.value
    return emails[0].value


def create_phishing_email(
    attack: Attack,
    request_type: core_types.TextGenerationRequestType,
    token: Optional[str] = None,
) -> PhishingEmail:
    """Create a phishing email."""

    token = with_default(token, uuid4().hex)
    impersonated_individual, profile = extract_profiles(attack=attack)

    # By default we pick one among the emails we control so that sending
    # will surely work. If insertion for the sake of bypassing checks
    # is possible then we can put whatever email in the sender field.
    sender_email = settings.COMMON_GMAIL_EMAIL_ADDRESS_1

    # Currently, the target is the only recipient.
    to_email = _pick_target_email(profile.emails)
    if email_utils.supports_insertion(to_email):
        logging.info(f"Target email {to_email} supports insertion.")
        if impersonated_individual is not None:
            sender_email = impersonated_individual.emails[0].value
            logging.info(f"Using {sender_email} as sender email.")

    generation_parameters = {
        "from_name": impersonated_individual.first_name
        if impersonated_individual is not None
        else None,
        "from_last_name": impersonated_individual.last_name
        if impersonated_individual is not None
        else None,
        "to_name": profile.first_name,
        "to_last_name": profile.last_name,
        "formal_level": core_types.TextGenerationFormalityLevel.INFORMAL,
        "urgency_level": core_types.TextGenerationUrgencyLevel.NORMAL,
        "text_request_type": request_type,
        "text_request_reason": core_types.TextGenerationRequestReason.NOT_WORKING,
        "text_request_length": core_types.TextGenerationRequestLength.SHORT,
        "temperature": 0,
        "model": "gpt-4",
    }

    subject, body = text_generation.generate_email_with_llm(**generation_parameters)

    phishing_email = PhishingEmail.objects.create(
        token=token,
        sender=sender_email,
        recipients=[to_email],
        subject=subject,
        body=body,
        is_html=True,
        generation_parameters=generation_parameters,
    )

    return phishing_email


def regenerate_email(email: PhishingEmail) -> None:
    """Regenerate the content of a phishing email and save it."""
    subject, body = text_generation.generate_email_with_llm(
        **email.generation_parameters
    )
    email.subject = subject
    email.body = body
    email.save(update_fields=["subject", "body"])


def get_domain(email: PhishingEmail):
    # TODO: change this when we support verified domains of a company.
    recipient = email.recipients[0]
    return recipient.split("@")[1]


def _wrap_link_with_fake_link(visible_link: str, href: str) -> str:
    return f'<a clicktracking="off" href={href} target="_blank">{visible_link}</a>'


def send_phishing_email(email: PhishingEmail, use_fake_url: bool = False):
    """Sends the phishing email.

    Args:
        email: The phishing email object.
        use_fake_url: set as True to use a fake URL text. Default False.
                      Only enable this if whitelisted.

    """

    token = email.token
    domain = get_domain(email)

    # TODO (?): by doing these interpolations at email creation time
    # rather than deploy time we avoid having to have ad hoc logic that
    # needs to distinguish between objectives, attacks and what not,
    # making the email deployment more abstracted and DRY.

    if email.artifact.attack.objective.goal == Goal.TARGET_CLICKED_ON_LINK:
        link = _phishing_token_url(token)
        if use_fake_url:
            # TODO: the usage here assumes that the email the domain is
            # always company related, is that the case?
            link = _wrap_link_with_fake_link(
                visible_link=html.escape(
                    f"https://{domain}/it-service/link?id={uuid4()}&token={uuid4()}"
                ),
                href=link,
            )
        template = "phishing/email-with-tracking-pixel.html"
    elif email.artifact.attack.objective.goal == Goal.CREDENTIALS:
        credentials_token = email.artifact.tokens.filter(
            type=TokenType.CREDENTIALS
        ).first()
        link = _github_login_url(token, credentials_token=credentials_token.token)
        if use_fake_url:
            link = _wrap_link_with_fake_link(
                visible_link=html.escape(f"https://github.com/actions/?id={uuid4()}"),
                href=link,
            )
        template = "phishing/email-with-tracking-pixel.html"
    else:
        raise ValueError(f"Unknown goal {email.artifact.attack.objective.goal}.")

    raw_body = email.body.replace("[link_for_user]", link)
    body = render_to_string(
        template,
        context={
            "paragraphs": raw_body.split("\n"),
            "tracking_pixel_url": _tracking_pixel_url(email.id),
        },
    )

    send_or_insert_email(
        from_email=email.sender,
        # Not really happy about using generation parameters for this.
        from_name=email.generation_parameters.get("from_name"),
        from_last_name=email.generation_parameters.get("from_last_name"),
        to_email=email.recipients[0],
        subject=email.subject,
        body=body,
        is_html=True,
        # See docs/email-whitelisting.md if use this for real.
        extra_headers={settings.MOLESEC_PHISHING_EMAIL_HEADER: "true"},
    )


__all__ = ["create_phishing_email", "send_phishing_email"]

import logging
from typing import Optional, Tuple

from core import errors as core_errors
from core import types
from core.text_generation import _llms

subject_body_divider = "[divider]"


def generate_email_with_llm(
    from_name: Optional[str] = None,
    from_last_name: Optional[str] = None,
    to_name: Optional[str] = None,
    to_last_name: Optional[str] = None,
    formal_level: types.TextGenerationFormalityLevel = types.TextGenerationFormalityLevel.INFORMAL,  # noqa
    urgency_level: types.TextGenerationUrgencyLevel = types.TextGenerationUrgencyLevel.NORMAL,  # noqa
    text_request_type: types.TextGenerationRequestType = types.TextGenerationRequestType.CLICK_LINK,  # noqa
    text_request_reason: types.TextGenerationRequestReason = types.TextGenerationRequestReason.NOT_WORKING,  # noqa
    text_request_length: types.TextGenerationRequestLength = types.TextGenerationRequestLength.SHORT,  # noqa
    include_link: bool = True,
    temperature: float = 0,
    model: str = "gpt-3.5-turbo",
) -> Tuple[str, str]:
    """Generate an email with the given parameters.

    Args:
        text_request_type: The type of request to make in the email. If
        include_link, the email will contain a [link_for_user]
        placeholder that can be substituted with a link.
    """
    feature_flags = _llms.TextGenerationChainFeatureFlags(
        temperature=temperature, model=model
    )
    chain = _llms.SimpleTextGenerationChain(feature_flags=feature_flags)
    email: str = chain(
        {
            "from_name": from_name,
            "from_last_name": from_last_name,
            "to_name": to_name,
            "to_last_name": to_last_name,
            "formal_level": formal_level,
            "urgency_level": urgency_level,
            "text_request_type": text_request_type,
            "text_request_reason": text_request_reason,
            "subject_body_divider": subject_body_divider,
            "include_link": include_link,
            "text_request_length": text_request_length,
        }
    )[chain.output_key]

    try:
        subject, body = tuple(
            text.strip() for text in email.split(subject_body_divider)
        )
    except ValueError as e:
        raise core_errors.TextGenerationFailureError(
            "Divider not correctly generated."
        ) from e

    if (
        include_link
        # TODO: make this a constant, perhaps use curly brackets since
        # it's more python native (will probably need some toying around
        # because of the prompt formatting).
        and ("[link_for_user]" not in body or "[link_for_user]" in subject)
    ):
        logging.error(f"Invalid email: {email}")
        raise core_errors.TextGenerationFailureError()

    return subject, body


__all__ = ["generate_email_with_llm"]

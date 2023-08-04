from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, TypeVar

import requests
from django.conf import settings
from django.db import transaction
from pydantic import EmailStr
from rest_framework import exceptions as rest_exceptions
from rest_framework import serializers
from slack_sdk import WebClient
from urllib3.util import Retry

from core.errors import ApplicationError, TargetEmailIsNotUniqueError
from core.types import ErrorCategory, ErrorPayload

generic_error_payload: ErrorPayload = {
    "data": {},
    "message": "",
    "category": ErrorCategory.ERROR,
    "error_code": ErrorCategory.ERROR.value,
}


def exception_to_response_data(exc: Exception) -> ErrorPayload:
    if isinstance(exc, ApplicationError):
        return {
            "message": exc.message,
            "data": exc.data,
            "category": exc.category.value,
            "error_code": exc.error_code,
        }
    if isinstance(exc, rest_exceptions.ValidationError):
        return {
            "message": "Validation error.",
            "data": exc.detail,
            "category": ErrorCategory.VALIDATION_ERROR,
            "error_code": ErrorCategory.VALIDATION_ERROR.value,
        }
    return generic_error_payload


def get_subclasses_and_self(cls):
    return [cls] + _get_subclasses(cls)


def _get_subclasses(cls):
    subclasses = []
    for subclass in cls.__subclasses__():
        subclasses.append(subclass)
        subclasses.extend(_get_subclasses(subclass))
    return subclasses


def get_requests_session_with_retries(
    total_retries: int = 4,
    status_forcelist: Optional[List[int]] = None,
    method_whitelist: Optional[List[str]] = None,
    backoff_factor: int = 2,
):
    if status_forcelist is None:
        status_forcelist = [429, 500, 502, 503, 504]
    if method_whitelist is None:
        method_whitelist = ["GET"]

    _retry_strategy = Retry(
        total=total_retries,
        status_forcelist=status_forcelist,
        method_whitelist=method_whitelist,
        backoff_factor=backoff_factor,
    )
    _rq_adapter = requests.adapters.HTTPAdapter(max_retries=_retry_strategy)
    _rq_session = requests.Session()
    _rq_session.mount("https://", _rq_adapter)
    return _rq_session


T = TypeVar("T")


def with_default(value: Optional[T], default: T):
    """Return `default` if `value` is None; return `value` otherwise."""
    return default if value is None else value


class SLACK_CHANNELS(str, Enum):
    MESSAGES = "MESSAGES"
    ERRORS = "ERRORS"


def send_slack_message(
    msg: str, channel: SLACK_CHANNELS = SLACK_CHANNELS.MESSAGES
) -> None:
    """Send a message to a slack channel.

    The message will be sent after the current transaction is committed.

    Args:
        msg: The message.
        channel: Where to send the message.
    """
    transaction.on_commit(lambda: _send_slack_message(msg, channel))


def _send_slack_message(
    msg: str, channel: SLACK_CHANNELS = SLACK_CHANNELS.MESSAGES
) -> None:
    client = WebClient(token=settings.SLACK_TOKEN)

    channel_to_id: Dict[SLACK_CHANNELS, str] = {
        SLACK_CHANNELS.MESSAGES: "C01SPGA99H7",
        SLACK_CHANNELS.ERRORS: "C01RPUTGENB",
    }
    channel_id = channel_to_id[channel]
    msg = f"{settings.RELEASE_ENVIRONMENT}: {msg}"

    client.chat_postMessage(
        channel=channel_id, text=msg, unfurl_links=False, unfurl_media=False
    )


def validate_targets(target_emails: List[str]):
    emails = {EmailStr(email) for email in target_emails}
    if len(target_emails) != len(emails):
        raise TargetEmailIsNotUniqueError("Duplicated Target emails.")


class DatesSerializer(serializers.Serializer):
    begins_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()

    def validate(self, attrs):
        if attrs["begins_at"] > attrs["expires_at"]:
            raise serializers.ValidationError(
                "begins_at cannot be greater than expires_at"
            )

        return attrs


def validate_dates(data: Dict[str, Any]) -> Dict[str, datetime]:
    begins_at = data.get("begins_at")
    expires_at = data.get("expires_at")
    dates_serializer = DatesSerializer(
        data={"expires_at": expires_at, "begins_at": begins_at}
    )

    dates_serializer.is_valid(raise_exception=True)

    return dates_serializer.validated_data

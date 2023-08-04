from enum import Enum
from typing import Any, Dict, TypedDict


class ErrorCategory(str, Enum):
    """High level categories of errors."""

    # Generic error, uncaught exceptions and middleware errors (403s
    # etc.) are bucketed into this category.
    ERROR = "ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # Custom errors of the application.
    APP_ERROR = "APP_ERROR"


class ErrorPayload(TypedDict):
    data: Dict[str, Any]
    message: str
    category: ErrorCategory
    error_code: str

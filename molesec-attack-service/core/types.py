from datetime import date
from enum import Enum
from typing import Any, List, Literal, Optional, TypedDict

from pydantic import UUID4, BaseModel, EmailStr


class ErrorCategory(str, Enum):
    """High level categories of errors."""

    # Generic error, uncaught exceptions and middleware errors (403s
    # etc.) are bucketed into this category.
    ERROR = "ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # Custom errors of the application.
    APP_ERROR = "APP_ERROR"
    EMAIL_SENDING_ERROR = "EMAIL_SENDING_ERROR"
    EMAIL_INSERTION_ERROR = "EMAIL_INSERTION_ERROR"
    EMAIL_IS_NOT_DRAFT = "EMAIL_IS_NOT_DRAFT"
    INVALID_OBJECTIVE_JSON_ERROR = "INVALID_OBJECTIVE_JSON_ERROR"
    INVALID_TARGET_JSON_ERROR = "INVALID_TARGET_JSON_ERROR"
    OBJECTIVE_EXPIRED_ERROR = "OBJECTIVE_EXPIRED_ERROR"
    PROFILE_DATA_ERROR = "PROFILE_DATA_ERROR"
    TARGET_ALREADY_UNDER_ATTACK_ERROR = "TARGET_ALREADY_UNDER_ATTACK_ERROR"
    TARGET_EMAIL_IS_NOT_UNIQUE = "TARGET_EMAIL_IS_NOT_UNIQUE"
    TEXT_GENERATION_FAILURE = "TEXT_GENERATION_FAILURE"


class ErrorPayload(TypedDict):
    data: Any
    message: str
    category: ErrorCategory
    error_code: str


class TextGenerationFormalityLevel(str, Enum):
    INFORMAL = "INFORMAL"
    FORMAL = "FORMAL"


class TextGenerationUrgencyLevel(str, Enum):
    URGENT = "URGENT"
    NORMAL = "NORMAL"
    CAN_WAIT = "CAN_WAIT"


class TextGenerationRequestType(str, Enum):
    CLICK_LINK = "CLICK_LINK"
    LOOK_INTO_THIS = "LOOK_INTO_THIS"


class TextGenerationRequestReason(str, Enum):
    NOT_WORKING = "NOT_WORKING"
    WHAT_IS_IT = "WHAT_IS_IT"


class TextGenerationRequestLength(str, Enum):
    SHORT = "SHORT"
    MEDIUM = "MEDIUM"
    LONG = "LONG"


class PhishingEmailPatchPayload(TypedDict):
    subject: Optional[str]
    body: Optional[str]
    is_draft: Optional[bool]


PhishingEmailPatchPayloadKeys = List[Literal["subject", "body", "is_draft"]]

AttackArtifactContentType = Literal["email"]


class Email(BaseModel):
    value: EmailStr


class Individual(BaseModel):
    id: UUID4
    emails: List[Email]
    first_name: Optional[str]
    last_name: Optional[str]
    languages: List[str]
    date_of_birth: Optional[date]
    role_title: Optional[str]


class Organization(BaseModel):
    id: UUID4
    domains: List[str]
    languages: List[str]
    name: str
    industry: Optional[str]
    timezone: Optional[str]


class ProfileData(Individual):
    peers: List[Individual]
    organization: Organization


class IndividualName(TypedDict):
    first_name: Optional[str]
    last_name: Optional[str]

from core.types import ErrorCategory


class ApplicationError(Exception):
    category: ErrorCategory = ErrorCategory.APP_ERROR
    error_code = ErrorCategory.APP_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class ObjectiveExpiredError(ApplicationError):
    category: ErrorCategory = ErrorCategory.OBJECTIVE_EXPIRED_ERROR
    error_code = ErrorCategory.OBJECTIVE_EXPIRED_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class InvalidObjectiveJsonError(ApplicationError):
    category: ErrorCategory = ErrorCategory.INVALID_OBJECTIVE_JSON_ERROR
    error_code = ErrorCategory.INVALID_OBJECTIVE_JSON_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class InvalidTargetJsonError(ApplicationError):
    category: ErrorCategory = ErrorCategory.INVALID_TARGET_JSON_ERROR
    error_code = ErrorCategory.INVALID_TARGET_JSON_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class TargetAlreadyUnderAttackError(ApplicationError):
    category: ErrorCategory = ErrorCategory.TARGET_ALREADY_UNDER_ATTACK_ERROR
    error_code = ErrorCategory.TARGET_ALREADY_UNDER_ATTACK_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class TargetEmailIsNotUniqueError(ApplicationError):
    category: ErrorCategory = ErrorCategory.TARGET_EMAIL_IS_NOT_UNIQUE
    error_code = ErrorCategory.TARGET_EMAIL_IS_NOT_UNIQUE.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class EmailIsNotDraftError(ApplicationError):
    category: ErrorCategory = ErrorCategory.EMAIL_IS_NOT_DRAFT
    error_code = ErrorCategory.EMAIL_IS_NOT_DRAFT.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}


class TextGenerationFailureError(ApplicationError):
    category: ErrorCategory = ErrorCategory.TEXT_GENERATION_FAILURE
    error_code = ErrorCategory.TEXT_GENERATION_FAILURE.value


class ProfileDataError(ApplicationError):
    category: ErrorCategory = ErrorCategory.PROFILE_DATA_ERROR
    error_code = ErrorCategory.PROFILE_DATA_ERROR.value


class EmailSendingError(ApplicationError):
    category: ErrorCategory = ErrorCategory.EMAIL_SENDING_ERROR
    error_code = ErrorCategory.EMAIL_SENDING_ERROR.value


class EmailInsertionError(EmailSendingError):
    category: ErrorCategory = ErrorCategory.EMAIL_INSERTION_ERROR
    error_code = ErrorCategory.EMAIL_INSERTION_ERROR.value


class EmailInsertionAuthError(EmailInsertionError):
    error_code = "EMAIL_INSERTION_AUTH_ERROR"

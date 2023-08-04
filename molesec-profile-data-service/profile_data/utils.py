from rest_framework import exceptions as rest_exceptions

from profile_data import errors as pd_errors
from profile_data import types

generic_error_payload: types.ErrorPayload = {
    "data": {},
    "message": "",
    "category": types.ErrorCategory.ERROR.value,
    "error_code": types.ErrorCategory.ERROR.value,
}


def exception_to_response_data(exc: Exception) -> types.ErrorPayload:
    if isinstance(exc, pd_errors.ApplicationError):
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
            "category": types.ErrorCategory.VALIDATION_ERROR.value,
            "error_code": types.ErrorCategory.VALIDATION_ERROR.value,
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

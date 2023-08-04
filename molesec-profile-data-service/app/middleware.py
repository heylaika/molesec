"""Inbound/outbound middleware for API requests/responses."""
import logging

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler

from profile_data import utils as pd_utils


def custom_exception_handler(exc, ctx):
    """Makes exceptions payloads consistent.

    Makes it so that every exception is returned as a JSON object with:
    - a message.
    - a data field, which is an object with additional data about the
      error. The data itself is not standardized.
    - a category field, which categorizes the error at a high level.
    - a error_code field, which is a unique code for the error.

    """
    # Adapted from django style guide. It provides a uniform interface
    # over the API error payloads, e.g.:
    # {"message":"Validation error","data":{"fields":{"input":["This
    # field is required."]}}.
    logging.error(type(exc))
    logging.error(exc)

    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(as_serializer_error(exc))

    if isinstance(exc, Http404):
        exc = exceptions.NotFound()

    if isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    default_response = exception_handler(exc, ctx)
    resp_code = 500 if default_response is None else default_response.status_code
    resp_data = pd_utils.exception_to_response_data(exc)
    return Response(resp_data, status=resp_code)

"""Core errors.

These errors can be used to abstract and unify the different issues
that can happen when interacting with data sources.

Each exception should have, either through inheritance of by setting it
in the constructor, the following:
- "message": human readable message exposed to the client. No sensitive
  data should be included.
- "data": additional data about the error. This is not standardized.
- "category": high level category of the error.
- "error_code": error code specific to the error.

See the serializers module for how these errors are handled. When adding
a new error, make it so that it can be instantiated without passing
arguments, this is to make it easier to programmatically generate
documentation/serializers.

When adding a new category of errors, you might be interested in also
adding a new category of error serializers (see serializers.py) and
openapi examples (see api.py).

"""
from profile_data import types as pd_types


class ApplicationError(Exception):
    category: pd_types.ErrorCategory = pd_types.ErrorCategory.APP_ERROR
    error_code = pd_types.ErrorCategory.APP_ERROR.value

    def __init__(self, message: str = ""):
        super().__init__(message)

        self.message = message
        self.data = {}

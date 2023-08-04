import json
from typing import Any

from cachetools import TTLCache, cached
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework_api_key.permissions import HasAPIKey


class HasAPIKeyCached(HasAPIKey):
    # Caching the API key validity until
    # https://github.com/florimondmanca/djangorestframework-api-key/issues/173
    # is solved.
    @cached(cache=TTLCache(maxsize=1000, ttl=2 * 60), key=lambda model, key: key)
    def _cached_is_model_valid(model, key):
        return model.objects.is_valid(key)

    def has_permission(self, request, view) -> bool:
        assert (
            self.model is not None
        ), f"{self.__class__.__name__} must define `.model` with the API key model. "
        key = self.get_key(request)
        if not key:
            return False
        return HasAPIKeyCached._cached_is_model_valid(self.model, key)


@extend_schema_field(OpenApiTypes.ANY)
class MakeSureItsJsonConvertibleField(serializers.ReadOnlyField):
    def to_representation(self, value) -> Any:
        try:
            json.dumps(value)
            return value
        except Exception:
            return str(value)

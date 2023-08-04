"""Serializers for the profile_data app.

Along with manually defined serializers, this module defines serializers
for all app errors programmatically (along with example payloads), so
that these can be used in the API views to generate OpenApiExamples and
docs, see _generate_app_error_serializers_and_payloads.

"""
from typing import Dict, Tuple

from drf_spectacular.utils import inline_serializer
from rest_framework import exceptions as rf_exceptions
from rest_framework import serializers

from profile_data import errors as pd_errors
from profile_data import models as pd_models
from profile_data import types as pd_types
from profile_data import utils as pd_utils

_pd_error_classes = pd_utils.get_subclasses_and_self(pd_errors.ApplicationError)

error_serializer = inline_serializer(
    name=pd_types.ErrorCategory.ERROR.value,
    fields={
        "message": serializers.CharField(),
        "data": serializers.DictField(),
        "category": serializers.ChoiceField(
            choices=[c.value for c in pd_types.ErrorCategory]
        ),
        "error_code": serializers.ChoiceField(
            choices=[cls.error_code for cls in _pd_error_classes]
        ),
    },
)


def _generate_app_error_serializers_and_payloads() -> Tuple[
    Dict[str, serializers.Serializer], Dict[str, pd_types.ErrorPayload]
]:
    tmp_error_code_to_serializer = {}
    tmp_error_code_to_example_payload = {}

    for cls in _pd_error_classes:
        exc: pd_errors.ApplicationError = cls()
        tmp_error_code_to_example_payload[
            exc.error_code
        ] = pd_utils.exception_to_response_data(exc)
        tmp_error_code_to_serializer[exc.error_code] = inline_serializer(
            name=f"ERROR_{exc.error_code}",
            fields={
                "message": serializers.CharField(),
                # Use read only fields instead of ChoiceField because it
                # makes it easier to read in the swagger schema, and it
                # can only assume one value.
                "category": serializers.CharField(
                    default=exc.category.value, read_only=True
                ),
                "error_code": serializers.CharField(
                    default=exc.error_code, read_only=True
                ),
                "data": serializers.DictField(),
            },
        )
    tmp_error_code_to_example_payload[
        pd_utils.generic_error_payload["error_code"]
    ] = pd_utils.generic_error_payload

    tmp_error_code_to_serializer[
        pd_utils.generic_error_payload["error_code"]
    ] = error_serializer

    # Trigger a validation error to have an example payload for it.
    try:

        class TmpSerializer(serializers.Serializer):
            some_property = serializers.CharField(required=True)

        serializer = TmpSerializer(data={})
        serializer.is_valid(raise_exception=True)
    except rf_exceptions.ValidationError as exception:
        data = pd_utils.exception_to_response_data(exception)
        tmp_error_code_to_example_payload[data["error_code"]] = data
        tmp_error_code_to_serializer[data["error_code"]] = inline_serializer(
            name=f'ERROR_{data["error_code"]}',
            fields={
                "message": serializers.CharField(),
                "data": serializers.DictField(),
                "category": serializers.CharField(
                    default=data["error_code"], read_only=True
                ),
                "error_code": serializers.CharField(
                    default=data["error_code"], read_only=True
                ),
            },
        )

    return tmp_error_code_to_serializer, tmp_error_code_to_example_payload


(
    error_code_to_serializer,
    error_code_to_example_payload,
) = _generate_app_error_serializers_and_payloads()


# Serializer for list of strings.
class StringListSerializer(serializers.ListSerializer):
    child = serializers.CharField()


class LanguageListSerializer(serializers.ListSerializer):
    child = serializers.ChoiceField(choices=pd_models.LanguageCode.choices)


class OrganizationSerializer(serializers.ModelSerializer):
    domains = StringListSerializer()
    languages = LanguageListSerializer()

    class Meta:
        model = pd_models.Organization
        fields = "__all__"


class OrganizationPUTSerializer(serializers.Serializer):

    id = serializers.UUIDField()
    name = serializers.CharField(max_length=255, required=False)
    industry = serializers.CharField(max_length=255, required=False)
    timezone = serializers.CharField(max_length=255, required=False)
    domains = StringListSerializer(required=False)
    languages = LanguageListSerializer(required=False)


class IndividualHandleSerializer(serializers.ModelSerializer):
    class Meta:
        model = pd_models.IndividualHandle
        exclude = ["id", "organization", "individual", "type"]


class EmailHandleSerializer(IndividualHandleSerializer):
    value = serializers.EmailField()


class IndividualSerializerWithHandles(serializers.ModelSerializer):
    emails = serializers.SerializerMethodField()

    def get_emails(self, obj) -> EmailHandleSerializer(many=True):
        # Use a list comprehension instead of a queryset filter to make
        # use of the prefetched entries.
        email_handles = [
            handle
            for handle in obj.handles.all()
            if handle.type == pd_models.HandleType.EMAIL
        ]
        return EmailHandleSerializer(email_handles, many=True).data

    class Meta:
        model = pd_models.Individual
        exclude = ["organization"]


class IndividualSerializerWithOrg(IndividualSerializerWithHandles):
    organization = OrganizationSerializer()
    peers = IndividualSerializerWithHandles(many=True)

    class Meta:
        model = pd_models.Individual
        fields = "__all__"

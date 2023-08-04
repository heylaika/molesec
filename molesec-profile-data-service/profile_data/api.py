"""API views to interface with profile data.

The first part of the module is dedicated to programmatically
constructing OpenApiExamples to be used in the different API endpoints.
It basically iterates over error classes (when needed) and makes use of
the predefined error serializers from the serializers module to generate
the examples.

The rest of the module is dedicated to the actual API views.
"""

import logging

from django.db.models import Prefetch
from django.http import JsonResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from app import utils as app_utils
from profile_data import models as pd_models
from profile_data import serializers as pd_serializers
from profile_data import types as pd_types

_validation_error_example = OpenApiExample(
    pd_types.ErrorCategory.VALIDATION_ERROR.value,
    value=pd_serializers.error_code_to_example_payload[
        pd_types.ErrorCategory.VALIDATION_ERROR.value
    ],
    status_codes=[400],
    response_only=True,
)


class OrganizationList(APIView):
    permission_classes = (app_utils.HasAPIKeyCached | IsAdminUser,)

    @extend_schema(
        request=pd_serializers.OrganizationPUTSerializer,
        responses={
            201: pd_serializers.OrganizationSerializer,
        },
    )
    def put(self, request, format=None):
        """Allows to create or update an organization."""
        serializer = pd_serializers.OrganizationPUTSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record, _ = pd_models.Organization.objects.update_or_create(
            id=serializer.validated_data["id"],
            defaults=serializer.validated_data,
        )

        output_data = pd_serializers.OrganizationSerializer(record).data
        return JsonResponse(
            output_data,
            status=status.HTTP_200_OK,
        )


class OrganizationDetail(APIView):
    permission_classes = (app_utils.HasAPIKeyCached | IsAdminUser,)

    @extend_schema(
        responses={200: {}},
    )
    def delete(self, request, organization_id: str, format=None):
        """Idempotent."""
        pd_models.Organization.objects.filter(id=organization_id).delete()
        return Response(status=status.HTTP_200_OK)


class IndividualsList(ListAPIView):
    """User profile data."""

    permission_classes = (app_utils.HasAPIKeyCached | IsAdminUser,)

    serializer_class = pd_serializers.IndividualSerializerWithOrg
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        "handles__value": ["exact"],
        "handles__type": ["exact"],
    }

    def _infer_org_data_from_request(self, request) -> None:
        """Infers organization data from a request.

        This is used to improve the "bootstrapping" of profile data,
        might make sense to later allow this to be done through PUT/POST
        calls later.

        """
        value = request.query_params.get("handles__value")
        type_ = request.query_params.get("handles__type")
        if type_ != pd_models.HandleType.EMAIL.value or value is None:
            return

        org_id = self.kwargs["organization_id"]

        org_exists = pd_models.Organization.objects.filter(id=org_id).exists()
        if not org_exists:
            return

        individual_handle_exists = pd_models.IndividualHandle.objects.filter(
            value=value, type=type_, individual__organization=org_id
        ).exists()

        if not individual_handle_exists:
            serializer = pd_serializers.EmailHandleSerializer(data={"value": value})
            serializer.is_valid(raise_exception=True)

            logging.info(f"Inferred email {value} for org {org_id}.")
            individual = pd_models.Individual.objects.create(
                organization_id=org_id,
                languages=[pd_models.LanguageCode.EN],
            )
            pd_models.IndividualHandle.objects.create(
                organization_id=org_id,
                individual=individual,
                value=value,
                type=type_,
            )

    def get_queryset(self):
        # Working when the value is not provided is required for
        # generating the swagger schema if you don't set queryset as a
        # class attribute, but we can't do that because we need to
        # dynamically generate the queryset to account for the
        # org_id through the URL.
        queryset = pd_models.Individual.objects
        org_id = self.kwargs.get("organization_id")
        if org_id is not None:
            queryset = queryset.filter(organization=org_id)
        return queryset

    def list(self, request, *args, **kwargs):
        self._infer_org_data_from_request(request)

        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.select_related("organization")

        # Spent a bit too much time trying to do a prefetch related
        # which would filter out the current record from the peers list,
        # this will suffice for now.
        queryset = queryset.prefetch_related(
            Prefetch("organization__individual_set", to_attr="peers")
        )
        for record in queryset:
            record.peers = [
                peer for peer in record.organization.peers if peer.id != record.id
            ]

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

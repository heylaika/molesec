from io import BytesIO
from typing import Optional

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from PIL import Image
from pydantic import EmailStr
from rest_framework import serializers
from rest_framework import status as http_status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from app.utils import HasAPIKeyCached
from core import text_generation
from core.attack_event_listener import receive_email_opened_event, record_token_consumed
from core.models import Attack, Objective
from core.profile_data import get_profile_data
from core.serializers import (
    AttackDetailsSerializer,
    AttackListItemSerializer,
    CreateObjectiveSerializer,
    DevSendEmailSerializer,
    DevTextGenerationSerializer,
    GetObjectiveSerializer,
    UpdateObjectiveSerializer,
)
from core.utils.emails import send_or_insert_email, user_has_enabled_domain_delegation


@extend_schema(tags=["Attacks"])
class AttackList(ListAPIView):
    permission_classes = (HasAPIKeyCached | IsAdminUser,)
    serializer_class = AttackListItemSerializer

    @extend_schema(responses={200: AttackListItemSerializer()})
    def list(self, request, objective_id: str, *args, **kwargs):
        attacks = Attack.objects.filter(objective__id=objective_id)
        queryset = attacks.prefetch_related("logs")
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)


@extend_schema(tags=["Attacks"])
class AttackObject(APIView):
    permission_classes = (HasAPIKeyCached | IsAdminUser,)

    @extend_schema(responses={200: AttackDetailsSerializer()})
    def get(self, request, attack_id: str):
        attack = Attack.objects.filter(id=attack_id).prefetch_related("logs").first()

        if attack is None:
            raise ObjectDoesNotExist(f"Attack with ID {attack_id} is not found.")

        serialized_attack = AttackDetailsSerializer(attack)

        return Response(serialized_attack.data)


@extend_schema(tags=["Objectives"])
class CreateObjective(APIView):
    permission_classes = (HasAPIKeyCached | IsAdminUser,)

    @extend_schema(
        request=CreateObjectiveSerializer,
        responses={201: AttackListItemSerializer(many=True)},
    )
    def post(self, request, format=None):
        data = request.data

        with transaction.atomic():
            # Backward compatibility.
            if "target_emails" not in data:
                data["target_emails"] = [target["email"] for target in data["targets"]]
            serializer = CreateObjectiveSerializer(data=data)
            serializer.is_valid(raise_exception=True)

            (objective, attacks) = serializer.save()

            # Use GET to ensure profile is created for now. TODO: allow
            # passing the whole target.
            for attack in attacks:
                get_profile_data(objective.org_id, EmailStr(attack.target_email))

            attacks_serializer = AttackListItemSerializer(attacks, many=True)
            serialized_attacks = attacks_serializer.data

            response_data = {"attacks": serialized_attacks}
            return Response(response_data, status=http_status.HTTP_201_CREATED)


@extend_schema(tags=["Objectives"])
class Objectives(APIView):
    permission_classes = (HasAPIKeyCached | IsAdminUser,)

    @extend_schema(responses={200: GetObjectiveSerializer()})
    def get(self, request, objective_id: str):
        objective = get_object_or_404(Objective, id=objective_id)
        serializer = GetObjectiveSerializer(objective)

        return Response(serializer.data)

    @extend_schema(
        request=UpdateObjectiveSerializer, responses={200: GetObjectiveSerializer()}
    )
    def put(self, request, objective_id: str, format=None):
        objective = get_object_or_404(Objective, id=objective_id)

        serializer = UpdateObjectiveSerializer(objective, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(GetObjectiveSerializer(objective).data)


@extend_schema(tags=["Events"])
class ReceiveEmailOpenedEvent(APIView):
    # ! PUBLICLY ACCESSIBLE.
    permission_classes = tuple()

    file: "Optional[BytesIO]" = None

    def _get_tracking_png(self):
        """Return the tracking PNG file."""
        if self.file:
            return self.file.getvalue()

        # Generate a 1x1 transparent PNG image
        img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        self.file = buffer

        return self.file.getvalue()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                required=True,
                description="The ID of the PhishingEmail object",
            )
        ],
        responses={200: {}},
    )
    def get(self, request, format=None):
        """Register an EMAIL_OPENED event.

        Note that this event won't be triggered if the email is sent
        from a local dev server.
        """

        email_id = request.query_params.get("id", None)
        receive_email_opened_event(email_id)

        response = HttpResponse(self._get_tracking_png(), content_type="image/png")
        response["Content-Disposition"] = "inline; filename=tracking-pixel.png"
        return response


@extend_schema(tags=["Events"])
class ConsumePhishingToken(APIView):
    """An endpoint to track tokens being consumed.

    # ! PUBLICLY ACCESSIBLE.

    Tokens can be related to different kind of attack artifacts, attack
    types etc.

    """

    permission_classes = tuple()

    @extend_schema(
        responses={200: {}},
    )
    def get(self, request, token: str, format=None):
        """Consumes a phishing token."""
        record_token_consumed(token)

        return Response({}, status=http_status.HTTP_200_OK)


@extend_schema(tags=["Dev"])
class DevTestTextGeneration(APIView):
    permission_classes = (IsAdminUser,)

    @extend_schema(
        parameters=[DevTextGenerationSerializer],
        responses={
            200: inline_serializer(
                name="DevTestTextGenerationResponse",
                fields={
                    "text": serializers.CharField(),
                },
            )
        },
    )
    def get(self, request, format=None):
        serializer = DevTextGenerationSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        text = text_generation.generate_email_with_llm(**serializer.validated_data)
        return Response({"text": text}, status=http_status.HTTP_200_OK)


@extend_schema(tags=["Dev"])
class DevSendEmail(APIView):
    permission_classes = (IsAdminUser,)

    @extend_schema(
        request=DevSendEmailSerializer,
        responses={200: {}},
    )
    def post(self, request, format=None):
        """Send an email.

        Be sure you ain't in DEBUG mode &&
        SENDGRID_SANDBOX_MODE_IN_DEBUG isn't True or no emails will get
        out.
        """
        serializer = DevSendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_or_insert_email(**serializer.validated_data)

        return Response({}, status=http_status.HTTP_200_OK)


@extend_schema(tags=["Checks"])
class DomainDelegationEnabled(APIView):
    permission_classes = (HasAPIKeyCached | IsAdminUser,)

    class DomainDelegationEnabledRequestSerializer(serializers.Serializer):
        email = serializers.EmailField()

    @extend_schema(
        request=DomainDelegationEnabledRequestSerializer,
        responses={
            200: inline_serializer(
                name="DomainDelegationEnabledResponse",
                fields={
                    "enabled": serializers.BooleanField(),
                },
            )
        },
    )
    def post(self, request, format=None):
        """Check if domain delegation is enabled for a given email.

        The email must be a valid email address from the organization
        for which we expect domain delegation. It "should" be the same
        email that was used for domain verification, i.e. the admin
        email, and not a normal user email.

        *Note*: due to an implementation detail, this endpoint will send
        a test email to the provided email, attempt to use it as little
        as possible, i.e. only verify the delegation once if possible.
        If the delegation check fails no email is sent.
        """
        serializer = self.DomainDelegationEnabledRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enabled = user_has_enabled_domain_delegation(serializer.validated_data["email"])
        return Response({"enabled": enabled}, status=http_status.HTTP_200_OK)

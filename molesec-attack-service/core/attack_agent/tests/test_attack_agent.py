from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.transaction import TransactionManagementError
from django.db.utils import IntegrityError
from django.test import TestCase
from django.utils import timezone

from core.attack_agent.attack_artifacts import (
    ArtifactContentType,
    create_attack_artifact,
)
from core.models import Attack, AttackArtifact, AttackStatus, Objective, PhishingEmail
from core.types import ProfileData

test_email = "test@email.com"
org_id = uuid4()


def create_objective():
    now = timezone.now()
    later = now + timedelta(1)
    return Objective.objects.create(
        id=uuid4(),
        begins_at=now,
        expires_at=later,
        org_id=org_id,
        target_emails=[test_email],
    )


def create_attack(email: str, objective: Objective):
    return Attack.objects.create(
        target_email=email, objective=objective, org_id=objective.org_id
    )


class TestAttackAgent(TestCase):
    """Test models."""

    def setUp(self):
        """Create user and client."""
        self.objective = create_objective()
        self.email = test_email
        self.attack = create_attack(self.email, self.objective)

    def test_creating_attack_same_email_failed(self):
        """Test creating an attack for the same email is failed."""
        self.attack.status = AttackStatus.FAILED
        self.attack.save()

        self.attack = create_attack(self.email, self.objective)

        # Able to create a new attack if there's no active attack.
        another_objective = create_objective()

        # Create another attack in the same objective is not allowed.
        # One individual can only belong to one attack at a time.
        with transaction.atomic():
            with self.assertRaises((IntegrityError, ValidationError)):
                create_attack(self.email, self.objective)

        # Attack the same email in a different objective is also not
        # allowed. One-attack-at-a-time restriction is org-wide.
        with transaction.atomic():
            with self.assertRaises((IntegrityError, ValidationError)):
                create_attack(self.email, another_objective)

    @patch("core.attack_agent.phishing_emails.get_profile_data")
    @patch("core.text_generation.generate_email_with_llm")
    def test_create_delete_phishing_email_successful(
        self, mock_generate_email_with_llm, mock_get_profile_data
    ):
        """
        Test creating and deleting an attack artifact is successful
        """
        # Prevent firing the actual request!
        mock_generate_email_with_llm.return_value = (
            "Need your help!",
            "Hi John, click [link_for_user]. thanks!",
        )

        mock_get_profile_data.return_value = ProfileData(
            **{
                "id": "49fbe5ba-5877-4c8d-a714-c1443af96135",
                "emails": [
                    {
                        "value": test_email,
                        "time_created": "2023-04-12T13:08:58.283931Z",
                        "provided_by_org": False,
                    }
                ],
                "organization": {
                    "id": "ea6e6a73-f2a0-4faa-a2d7-5dc5f7fe0a59",
                    "domains": [],
                    "languages": [],
                    "time_created": "2023-04-12T13:08:08.710689Z",
                    "name": "Orchest",
                    "industry": None,
                    "timezone": None,
                },
                "peers": [
                    {
                        "id": "a45d209f-58fd-44b8-8519-7e1d3ba23e55",
                        "emails": [
                            {
                                "value": "colleague@email.com",
                                "time_created": "2023-04-14T15:14:01.503332Z",
                                "provided_by_org": False,
                            }
                        ],
                        "time_created": "2023-04-14T15:13:26.299691Z",
                        "first_name": "John",
                        "last_name": "Doe",
                        "date_of_birth": "2000-07-04",
                        "languages": [],
                        "role_title": None,
                    }
                ],
                "time_created": "2023-04-12T13:08:31.177924Z",
                "first_name": "Huang",
                "last_name": "Testing",
                "date_of_birth": None,
                "languages": [],
                "role_title": None,
            }
        )

        artifact = create_attack_artifact(self.attack, ArtifactContentType.EMAIL)
        content_object = artifact.content_object

        # Ensure that the content object is of the right type.
        self.assertTrue(isinstance(content_object, PhishingEmail))
        self.assertEqual(self.attack, artifact.attack)

        with transaction.atomic():
            # Ensure that the associated object is unique.
            with self.assertRaises((TransactionManagementError, IntegrityError)):
                AttackArtifact.objects.create(
                    attack=artifact.attack,
                    content_object=artifact.content_object,
                )

        # Ensure that artifact is accessible from the content object.
        email = PhishingEmail.objects.filter(id=getattr(content_object, "id")).first()
        self.assertEqual(artifact, getattr(email, "artifact"))

        artifact.delete()

        # Ensure that the content object is deleted
        # along with the artifact.
        emails = PhishingEmail.objects.filter(id=getattr(content_object, "id"))
        found_artifact = self.attack.artifacts.filter(id=artifact.id).first()

        self.assertIsNone(found_artifact)
        self.assertEqual(self.attack, artifact.attack)
        self.assertFalse(emails.exists())

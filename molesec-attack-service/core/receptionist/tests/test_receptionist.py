"""
Tests for models
"""


from typing import Any, List
from uuid import uuid4

from django.db import transaction
from django.test import TestCase

from core.errors import TargetEmailIsNotUniqueError
from core.receptionist import process_objective_payload


def is_equal(L1: List[Any], L2: List[Any]) -> bool:
    return len(L1) == len(L2) and set(L1) == set(L2)


class TestReceptionist(TestCase):
    """Test Receptionist logic."""

    def setUp(self):
        self.objective_id = uuid4()
        self.org_id = uuid4()
        self.default_payload = {
            "id": self.objective_id,
            "begins_at": "2023-04-02T18:59:49.811Z",
            "expires_at": "2023-05-02T18:59:49.812Z",
            "org_id": self.org_id,
            "goal": "TARGET_CLICKED_ON_LINK",
        }

    def test_process_objective_payload_successful(self):
        """Test creating an objective and attacks is successful"""

        targets = [
            {"email": "john@example.com"},
            {"email": "marry@example.com"},
        ]

        payload = {
            **self.default_payload,
            "targets": targets,
        }

        objective, attacks = process_objective_payload(payload)

        self.assertEqual(objective.id, self.objective_id)
        self.assertEqual(objective.org_id, self.org_id)
        self.assertTrue(
            is_equal(
                objective.target_emails, [attack.target_email for attack in attacks]
            )
        )

        for attack in attacks:
            self.assertEqual(attack.objective, objective)

    def test_failed_for_duplicated_email(self):
        """
        Test creating an objective and attacks is failed due to
        duplicated target emails.
        """

        targets = [
            {"email": "marry@example.com"},
            {"email": "marry@example.com"},
        ]

        payload = {
            **self.default_payload,
            "targets": targets,
        }

        with transaction.atomic():
            # Ensure that target emails are unique.
            with self.assertRaises((TargetEmailIsNotUniqueError,)):
                process_objective_payload(payload)

    def test_exclude_occupied_individual_successful(self):
        """
        Test creating an objective with a target that is under attack.
        """

        duplicated_email = "foo@example.com"

        first_payload = {
            **self.default_payload,
            "targets": [
                {"email": duplicated_email},
                {"email": "bar@example.com"},
            ],
        }

        process_objective_payload(first_payload)

        second_targets = [
            {"email": duplicated_email},
            {"email": "zoo@example.com"},
        ]

        second_payload = {
            **self.default_payload,
            "id": uuid4(),
            "targets": second_targets,
        }

        objective, attacks = process_objective_payload(second_payload)

        self.assertEqual(
            ["zoo@example.com"], [attack.target_email for attack in attacks]
        )
        self.assertTrue(
            is_equal(
                objective.target_emails, [target["email"] for target in second_targets]
            )
        )

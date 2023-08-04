"""Receptionist.

The Receptionist is in charge of processing new Objectives
and change the end date of the ongoing Objectives.

"""

from typing import List, Tuple

from django.db import transaction

from core.coordinators import attacks
from core.models import Attack, Objective
from core.utils import validate_dates, validate_targets


def process_objective_payload(payload: dict) -> Tuple[Objective, List[Attack]]:
    validate_dates(payload)

    target_emails: List[str] = payload.pop("target_emails")
    validate_targets(target_emails)

    with transaction.atomic():
        # The business constraint of not allowing concurrent attacks is
        # enforced by the unique constraint in the database and deal
        # with in create_attacks_for_objective. Note, however, that
        # target_emails is still set with all emails, so that an attack
        # can take place after, e.g. when the target is not under
        # another attack.
        objective = Objective.objects.create(target_emails=target_emails, **payload)
        attack_records = attacks.create_attacks_for_objective(
            objective=objective, emails=target_emails
        )

    return objective, attack_records

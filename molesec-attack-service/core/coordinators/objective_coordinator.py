import logging
from typing import List, Tuple

from django.db import transaction
from django.db.models import F, Func
from django.utils import timezone

from core.coordinators import attacks
from core.coordinators.objectives import expire_objective
from core.models import ActiveAttackStatuses, Attack, Objective, ObjectiveStatus


def update_objectives_status_by_time() -> List[Tuple[Objective, str]]:
    """Updates the status of ongoing objectives and expires objectives
    that have passed their expiration time.

    Returns a list of tuples containing the updated objectives and
    the email addresses of their targets.
    """
    objectives = Objective.objects.exclude(status=ObjectiveStatus.EXPIRED)
    now = timezone.now()

    objectives_should_be_ongoing = objectives.filter(
        begins_at__lt=now,
        expires_at__gt=now,
    )

    objectives_should_be_ongoing.update(status=ObjectiveStatus.ONGOING)

    # Doesn't actually need the iteration, but it would not call
    # _delete_unsent_artifacts and wouldn't be DRY then. TODOish.
    with transaction.atomic():
        objectives_to_expire = objectives.filter(
            expires_at__lte=now,
        ).all()

        for objective in objectives_to_expire:
            expire_objective(objective)

    objective_email_set = [
        (objective, target_email)
        for objective in objectives_should_be_ongoing
        for target_email in objective.target_emails
    ]

    return objective_email_set


def plan_new_attacks() -> None:
    logging.info("Planning new attacks.")

    # Beware if you want to modify the query, the combination of the ORM
    # and the current models lead to edge cases for most solutions in
    # this particular case, mostly due to operators around the array
    # field.
    busy_emails = (
        Attack.objects.filter(
            status__in=ActiveAttackStatuses,
        )
        .values("objective_id", "target_email")
        .distinct()
    )

    all_objective_target_emails = (
        Objective.objects.filter(status=ObjectiveStatus.ONGOING)
        # One record for each target email.
        .annotate(target_email=Func(F("target_emails"), function="unnest")).values(
            "id", "target_email"
        )
    )
    available_emails = all_objective_target_emails.difference(busy_emails).all()
    # Can't aggregate after performing a difference with the ORM :{.
    obj_to_emails = {}
    available_emails_set = set()
    for record in available_emails:
        email = record["target_email"]
        available_emails_set.add(email)
        obj_to_emails.setdefault(record["id"], []).append(email)

    for obj in Objective.objects.filter(id__in=obj_to_emails.keys()):
        attacked_emails = [
            email for email in obj_to_emails[obj.id] if email in available_emails_set
        ]
        if not attacked_emails:
            continue

        logging.info(f"Planning {len(attacked_emails)} attacks for objective {obj.id}.")
        # TODO: this is unfair to the other objectives.
        available_emails_set.difference_update(set(attacked_emails))
        attacks.create_attacks_for_objective(obj, attacked_emails)

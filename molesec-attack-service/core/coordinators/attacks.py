from typing import List

from django.db import transaction

from core.models import Attack, AttackStatus, Objective


def delete_unsent_artifacts(attack: Attack) -> None:
    """Delete all unsent artifacts of the attack."""
    attack.artifacts.filter(sent_at=None).delete()


def fail_attack(attack: Attack):
    """Sets Attack as FAILED an cleanup unused resources."""
    with transaction.atomic():
        delete_unsent_artifacts(attack)
        attack.status = AttackStatus.FAILED
        attack.save()


def set_success_attack(attack: Attack):
    """Marks an Attack as SUCCESS and cleanup unused resources."""
    with transaction.atomic():
        delete_unsent_artifacts(attack)
        attack.status = AttackStatus.SUCCESS
        attack.save()


def create_attacks_for_objective(objective: Objective, emails: List[str]):
    """Bulk create attacks. Ignores duplicate attacks."""
    new_attacks = [
        Attack(
            objective=objective,
            target_email=email,
            org_id=objective.org_id,
        )
        for email in emails
    ]
    # See the model unique constraint. This is needed to avoid race
    # conditions between the scheduler and an API call.
    Attack.objects.bulk_create(new_attacks, ignore_conflicts=True)

    return new_attacks

from django.db.models import QuerySet

from core.coordinators.attacks import fail_attack
from core.models import Attack, AttackStatusEndStates, Objective, ObjectiveStatus


def expire_objective(objective: Objective):
    objective.status = ObjectiveStatus.EXPIRED
    objective.save(update_fields=["status"])

    attacks: QuerySet[Attack] = objective.attack_set  # type: ignore

    non_end_state_attacks = (
        attacks.select_for_update().exclude(status__in=AttackStatusEndStates).all()
    )
    for attack in non_end_state_attacks:
        fail_attack(attack)

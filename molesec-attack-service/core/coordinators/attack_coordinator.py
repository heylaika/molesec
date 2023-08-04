import uuid

from django.db import transaction
from pydantic import EmailStr

from core.attack_agent.attack_artifacts import create_attack_artifact, deliver_artifacts
from core.coordinators.objective_coordinator import (
    plan_new_attacks,
    update_objectives_status_by_time,
)
from core.coordinators.profile_data_requirements import (
    CredentialsAttackRequirement,
    PhishingEmailRequirements,
)
from core.models import (
    Attack,
    AttackStatus,
    AttackStatusEndStates,
    Goal,
    ObjectiveStatus,
    PhishingToken,
    TokenType,
)
from core.profile_data import get_profile_data
from core.types import ProfileData


def monitor_attacks():
    # Set Objectives as ONGOING or EXPIRED.
    # When EXPIRED, all associated attacks are also set as FAILED.
    update_objectives_status_by_time()
    plan_new_attacks()

    # Only act on Attacks of ONGOING Objectives.
    active_attacks = (
        Attack.objects.exclude(status__in=AttackStatusEndStates)
        .filter(objective__status=ObjectiveStatus.ONGOING)
        .prefetch_related("objective")
    )

    # Collect the emails that already belong to the ongoing attacks.
    occupied_individuals = set()

    for attack in active_attacks:
        occupied_individuals.add(attack.target_email)
        if attack.status == AttackStatus.WAITING_FOR_DATA:
            check_profile_data(attack)
            continue

        if attack.status == AttackStatus.ONGOING:
            process_artifacts(attack)
            continue


def _profile_data_requirements_satisfied(
    attack: Attack, profile_data: ProfileData
) -> bool:
    goal_to_requirement = {
        Goal.TARGET_CLICKED_ON_LINK: PhishingEmailRequirements,
        Goal.CREDENTIALS: CredentialsAttackRequirement,
    }
    requirements = goal_to_requirement[attack.objective.goal]

    return requirements.is_met(attack.objective, attack, profile_data)


def check_profile_data(attack: Attack):
    """Check the latest scraped data from Profile Data Service.

    Fetch data and change the attack status to ONGOING if the data
    meets the criteria to start the attack.
    """

    objective = attack.objective
    email = EmailStr(attack.target_email)

    profile_data = get_profile_data(org_id=objective.org_id, email=email)

    if profile_data is None:
        return

    if _profile_data_requirements_satisfied(attack, profile_data):
        attack.status = AttackStatus.ONGOING
        attack.save()


def process_artifacts(attack: Attack):
    """Check the status of the associated artifacts and act upon it."""
    with transaction.atomic():
        #  - if Attack has no artifact, create the first artifact.
        if attack.artifacts.count() == 0:
            artifact = create_attack_artifact(attack)
            # TODO
            if attack.objective.goal == Goal.CREDENTIALS:
                PhishingToken.objects.create(
                    attack_artifact=artifact,
                    type=TokenType.CREDENTIALS,
                    token=uuid.uuid4().hex,
                )
            return

        #  - if Attack has approved artifacts, deliver them.
        deliver_artifacts(list(attack.artifacts))


__all__ = ["monitor_attacks"]

import logging
import types
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from enum import Enum
from typing import Callable

from django.utils import timezone

from core.errors import ApplicationError
from core.models import Attack, AttackLog, AttackStatusEndStates, Goal, Objective
from core.types import ProfileData


def _remaining_time_in_percentage(objective: Objective, every_n_days=30) -> int:
    """Return the remaining time per N days in percentage.

    Note: we want to ensure that every target gets at least
    one attack per N days (default to 30 days).

    """
    now = timezone.now()
    time_unit = timedelta(days=every_n_days)

    begins_at = objective.begins_at
    expires_at = objective.expires_at

    objective_remaining_time = expires_at - now

    is_ending_unit = objective_remaining_time <= time_unit

    # If time has entered the last time window, ignore the calculation
    # from the beginning. This means that, if time has entered the last
    # time window while being at the 4th day of a regular unit, the
    # total time of the last attack period will be N + 4 days.
    if is_ending_unit:
        remaining_time = objective_remaining_time
    else:
        remaining_time = time_unit - ((now - begins_at) % time_unit)

    return round(remaining_time / time_unit * 100)


class RemainingTimeCriteria(int, Enum):
    SEVENTY_FIVE_PERCENT = 75
    FIFTY_PERCENT = 50
    TWENTY_FIVE_PERCENT = 25


def _has_cool_down_ended(attack: Attack, cool_down: timedelta) -> bool:
    try:
        previous_attack = (
            Attack.objects.filter(
                target_email=attack.target_email,
                org_id=attack.org_id,
                status__in=AttackStatusEndStates,
            )
            .prefetch_related("logs")
            .latest("created_at")
        )
    except Attack.DoesNotExist:
        return True

    latest_log: AttackLog = getattr(previous_attack, "logs").latest("created_at")

    return latest_log.created_at + cool_down <= timezone.now()


@dataclass
class EvaluationContext:
    objective: Objective
    attack: Attack
    profile_data: ProfileData
    remaining_time_perc: int


Predicate = Callable[[EvaluationContext], bool]


def not_on_cooldown(cooldown: timedelta) -> Predicate:
    return lambda context: _has_cool_down_ended(context.attack, cooldown)


def remaining_time_perc_less_than(criteria: RemainingTimeCriteria) -> Predicate:
    return lambda context: context.remaining_time_perc < criteria


def has_first_name(context: EvaluationContext) -> bool:
    return context.profile_data.first_name is not None


def has_email(context: EvaluationContext) -> bool:
    return len(context.profile_data.emails) > 0


def has_peers(context: EvaluationContext) -> bool:
    return len(context.profile_data.peers) > 0


def has_role_title(context: EvaluationContext) -> bool:
    return context.profile_data.role_title is not None


def has_org_industry(context: EvaluationContext) -> bool:
    return context.profile_data.organization.get("industry") is not None


class Expression(ABC, Predicate):
    def __init__(self, *predicates: Predicate):
        self.predicates = predicates

    @abstractmethod
    def __call__(self, context: EvaluationContext) -> bool:
        pass

    def _print_predicates(self) -> None:
        builder = []
        for pred in self.predicates:
            if isinstance(pred, types.FunctionType):
                builder.append(pred.__name__)
            elif isinstance(pred, AllOf):
                builder.append("AllOf")
            elif isinstance(pred, AnyOf):
                builder.append("AnyOf")
            else:
                builder.append("predicate")
        builder = ", ".join(builder)
        print(f"\t{builder}")


class AllOf(Expression):
    def __call__(self, context: EvaluationContext) -> bool:
        logging.info(f"Evaluating {self.__class__.__name__}")
        self._print_predicates()
        return all(p(context) for p in self.predicates)


class AnyOf(Expression):
    def __call__(self, context: EvaluationContext) -> bool:
        logging.info(f"Evaluating {self.__class__.__name__}")
        self._print_predicates()
        return any(p(context) for p in self.predicates)


class AttackRequirement:
    goal: Goal = None
    predicate: Predicate

    def __init__(self, goal: Goal, predicate: Predicate):
        self.goal = goal
        self.predicate = predicate

    def is_met(
        self, objective: Objective, attack: Attack, profile_data: ProfileData
    ) -> bool:
        if objective.goal != self.goal:
            raise ApplicationError("Incorrect requirement.")
        remaining_time_perc = _remaining_time_in_percentage(objective)
        logging.info(
            f"Evaluating {self.__class__.__name__} for {attack.id} on "
            f"{attack.target_email} with {remaining_time_perc}% "
            "remaining time."
        )
        context = EvaluationContext(
            objective=attack.objective,
            attack=attack,
            profile_data=profile_data,
            remaining_time_perc=remaining_time_perc,
        )
        return self.predicate(context)


PhishingEmailRequirements = AttackRequirement(
    Goal.TARGET_CLICKED_ON_LINK,
    predicate=AllOf(
        not_on_cooldown(timedelta(days=7)),
        AnyOf(
            AllOf(
                remaining_time_perc_less_than(
                    RemainingTimeCriteria.TWENTY_FIVE_PERCENT
                ),
                has_first_name,
                has_email,
            ),
            AllOf(
                remaining_time_perc_less_than(RemainingTimeCriteria.FIFTY_PERCENT),
                has_first_name,
                has_email,
                has_role_title,
            ),
            AllOf(
                remaining_time_perc_less_than(
                    RemainingTimeCriteria.SEVENTY_FIVE_PERCENT
                ),
                has_first_name,
                has_email,
                has_role_title,
                has_peers,
            ),
            AllOf(
                has_first_name,
                has_email,
                has_role_title,
                has_peers,
                has_org_industry,
            ),
        ),
    ),
)

CredentialsAttackRequirement = AttackRequirement(
    Goal.CREDENTIALS,
    predicate=AllOf(
        not_on_cooldown(timedelta(days=7)),
        AnyOf(
            AllOf(
                remaining_time_perc_less_than(
                    RemainingTimeCriteria.TWENTY_FIVE_PERCENT
                ),
                has_first_name,
                has_email,
            ),
            AllOf(
                remaining_time_perc_less_than(RemainingTimeCriteria.FIFTY_PERCENT),
                has_first_name,
                has_email,
                has_peers,
            ),
            AllOf(
                remaining_time_perc_less_than(
                    RemainingTimeCriteria.SEVENTY_FIVE_PERCENT
                ),
                has_first_name,
                has_email,
                has_peers,
                has_role_title,
            ),
            AllOf(
                has_first_name,
                has_email,
                has_peers,
                has_role_title,
                has_org_industry,
            ),
        ),
    ),
)


__all__ = ["PhishingEmailRequirements"]

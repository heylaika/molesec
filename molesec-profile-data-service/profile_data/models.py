"""Models for the profile_data app.

The Organization model acts as a de facto namespace for data. When
creating a new model or changing one, make sure that it depends on the
Organization, i.e. the deletion of the Organization record should imply
the cascaded deletion of all related records.

Admin panel notes:
- Blank=True is set for null columns to allow empty values in the manual
  data entry done through the admin panel.
- __str__ is a bit more verbose for ease of use in the admin panel.

"""
from uuid import uuid4

from django.db import models


class BaseModel(models.Model):
    class Meta:
        abstract = True

    time_created = models.DateTimeField(auto_now_add=True, db_index=True)


# https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
class LanguageCode(models.TextChoices):
    EN = "EN"
    NL = "NL"


class Organization(BaseModel):
    class Meta:
        db_table = "profile_data_organizations"

    id = models.UUIDField(primary_key=True, default=uuid4)
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255, null=True, blank=True)
    timezone = models.CharField(max_length=255, null=True, blank=True)
    domains = models.JSONField(null=False, default=list, blank=True)

    # List of LanguageCodes.
    languages = models.JSONField(null=False, default=list, blank=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class _IndividualModelManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().prefetch_related("handles")


class Individual(BaseModel):
    class Meta:
        db_table = "profile_data_individuals"

    _base_manager = _IndividualModelManager
    objects = _IndividualModelManager()

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    id = models.UUIDField(primary_key=True, default=uuid4)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    languages = models.JSONField(null=False, default=list, blank=True)
    role_title = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.id})"


class HandleType(models.TextChoices):
    EMAIL = "EMAIL"


class IndividualHandle(BaseModel):
    class Meta:
        db_table = "profile_data_individual_handles"

        constraints = [
            models.UniqueConstraint(
                fields=["organization", "type", "value"],
                name="profile_data_individual_handles_unique_org_type_value",
            )
        ]

        indexes = [models.Index(fields=["organization", "type", "value"])]

    # Redundant given the FK to the individual, but needed to constraint
    # the uniqueness of an email across all individuals of an
    # organization. Note that this isn't a composite FK, sadly those are
    # not properly supported by Django.
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    individual = models.ForeignKey(
        Individual, on_delete=models.CASCADE, related_name="handles"
    )

    id = models.UUIDField(primary_key=True, default=uuid4)
    type = models.CharField(max_length=255, choices=HandleType.choices)
    value = models.CharField(max_length=255)
    provided_by_org = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.type} {self.value} ({self.id})"

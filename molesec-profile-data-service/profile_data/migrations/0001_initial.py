# Generated by Django 4.1.5 on 2023-03-29 11:36

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Individual",
            fields=[
                (
                    "time_created",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, primary_key=True, serialize=False
                    ),
                ),
                ("first_name", models.CharField(blank=True, max_length=255, null=True)),
                ("last_name", models.CharField(blank=True, max_length=255, null=True)),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("languages", models.JSONField(blank=True, default=list)),
                ("role", models.CharField(blank=True, max_length=255, null=True)),
            ],
            options={
                "db_table": "profile_data_individuals",
            },
        ),
        migrations.CreateModel(
            name="Organization",
            fields=[
                (
                    "time_created",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, primary_key=True, serialize=False
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("industry", models.CharField(blank=True, max_length=255, null=True)),
                ("timezone", models.CharField(blank=True, max_length=255, null=True)),
                ("domain", models.CharField(blank=True, max_length=255, null=True)),
                ("languages", models.JSONField(blank=True, default=list)),
            ],
            options={
                "db_table": "profile_data_organizations",
            },
        ),
        migrations.CreateModel(
            name="IndividualHandle",
            fields=[
                (
                    "time_created",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, primary_key=True, serialize=False
                    ),
                ),
                (
                    "type",
                    models.CharField(choices=[("EMAIL", "Email")], max_length=255),
                ),
                ("value", models.CharField(max_length=255)),
                ("provided_by_org", models.BooleanField(default=False)),
                (
                    "individual",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="handles",
                        to="profile_data.individual",
                    ),
                ),
            ],
            options={
                "db_table": "profile_data_individual_handles",
            },
        ),
        migrations.AddField(
            model_name="individual",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="profile_data.organization",
            ),
        ),
        migrations.AddConstraint(
            model_name="individualhandle",
            constraint=models.UniqueConstraint(
                fields=("individual_id", "type", "value"),
                name="profile_data_individual_handles_unique_individual_id_type_value",
            ),
        ),
    ]

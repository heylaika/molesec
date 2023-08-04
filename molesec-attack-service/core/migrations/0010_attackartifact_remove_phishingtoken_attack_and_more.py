# Generated by Django 4.1.7 on 2023-04-01 12:07

import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("core", "0009_merge_20230331_1653"),
    ]

    operations = [
        migrations.CreateModel(
            name="AttackArtifact",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("object_id", models.CharField(max_length=20)),
                (
                    "attack",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="core.attack"
                    ),
                ),
                (
                    "content_type",
                    models.ForeignKey(
                        limit_choices_to={"model__in": ("phishingemail",)},
                        on_delete=django.db.models.deletion.CASCADE,
                        to="contenttypes.contenttype",
                    ),
                ),
            ],
            options={
                "db_table": "attack_service_attack_artifacts",
            },
        ),
        migrations.RemoveField(
            model_name="phishingtoken",
            name="attack",
        ),
        migrations.AddField(
            model_name="phishingemail",
            name="opened_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="phishingemail",
            name="sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="phishingemail",
            name="token",
            field=models.CharField(
                db_index=True,
                default="2ba215bf49994b069c1f237749496def",
                max_length=200,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="phishingemail",
            name="token_consumed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="phishingemail",
            name="recipients",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.EmailField(max_length=254), size=None
            ),
        ),
        migrations.AlterField(
            model_name="phishingemail",
            name="sender",
            field=models.EmailField(max_length=254),
        ),
        migrations.DeleteModel(
            name="AttackActionable",
        ),
        migrations.DeleteModel(
            name="PhishingToken",
        ),
    ]
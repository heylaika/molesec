# Generated by Django 4.1.7 on 2023-04-19 21:23

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0025_attack_org_id_alter_objective_org_id_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="attack",
            name="unique_ongoing_attack_on_target_email_in_org",
        ),
        migrations.AlterField(
            model_name="objective",
            name="org_id",
            field=models.UUIDField(db_column="org_id", db_index=True),
        ),
        migrations.AddConstraint(
            model_name="attack",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("status__in", ["FAILED", "SUCCESS"]), _negated=True
                ),
                fields=("target_email", "org_id"),
                name="unique_active_attack_on_target_email_and_org_id",
            ),
        ),
    ]

# Generated by Django 4.1.7 on 2023-04-19 14:47

from django.db import migrations, models


def copy_org_id(apps, schema_editor):
    Attack = apps.get_model("core", "Attack")
    for attack in Attack.objects.all():
        # Copy the value from the old field to the new field
        attack.org_id = attack.objective.org_id
        attack.save()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0024_copy_target_email_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="attack",
            name="org_id",
            field=models.UUIDField(db_column="org_id", null=True),
            preserve_default=False,
        ),
        migrations.RunPython(copy_org_id),
        migrations.AlterField(
            model_name="attack",
            name="org_id",
            field=models.UUIDField(
                db_column="org_id",
                db_index=True,
                null=False,
                blank=False,
            ),
        ),
        migrations.AddConstraint(
            model_name="attack",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("status__in", ["FAILED", "SUCCESS"]), _negated=True
                ),
                fields=("target_email", "org_id"),
                name="unique_ongoing_attack_on_target_email_in_org",
            ),
        ),
    ]

# Generated by Django 4.1.7 on 2023-04-24 10:26

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0027_alter_attacklog_type_alter_objective_goal_and_more"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="PhishingTokens",
            new_name="PhishingToken",
        ),
    ]

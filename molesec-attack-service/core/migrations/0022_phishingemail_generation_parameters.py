# Generated by Django 4.1.7 on 2023-04-12 11:44

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0021_alter_attacklog_attack_alter_phishingemail_subject"),
    ]

    operations = [
        migrations.AddField(
            model_name="phishingemail",
            name="generation_parameters",
            field=models.JSONField(default=dict),
        ),
    ]

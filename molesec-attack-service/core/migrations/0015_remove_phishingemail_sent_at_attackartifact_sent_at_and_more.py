# Generated by Django 4.1.7 on 2023-04-04 16:30

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_merge_20230403_2008"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="phishingemail",
            name="sent_at",
        ),
        migrations.AddField(
            model_name="attackartifact",
            name="sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="phishingemail",
            name="is_draft",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="attack",
            name="status",
            field=models.CharField(
                choices=[
                    ("WAITING_FOR_DATA", "Waiting For Data"),
                    ("CREATING_CONTENT", "Creating Content"),
                    ("REVIEWING", "Reviewing"),
                    ("READY", "Ready"),
                    ("ONGOING", "Ongoing"),
                    ("EXPIRED", "Expired"),
                    ("SUCCESS", "Success"),
                ],
                default="WAITING_FOR_DATA",
                max_length=20,
            ),
        ),
    ]
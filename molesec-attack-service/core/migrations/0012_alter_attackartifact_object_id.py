# Generated by Django 4.1.7 on 2023-04-02 08:06

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0011_phishingemail_is_html_alter_phishingemail_token"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attackartifact",
            name="object_id",
            field=models.UUIDField(db_index=True),
        ),
    ]

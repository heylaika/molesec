# Generated by Django 4.1.7 on 2023-03-30 11:22

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_alter_attackactionable_table_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="attackactionable",
            old_name="type",
            new_name="content_type",
        ),
        migrations.AddField(
            model_name="attackactionable",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True, db_index=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="attackactionable",
            name="attack",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE, to="core.attack"
            ),
        ),
    ]
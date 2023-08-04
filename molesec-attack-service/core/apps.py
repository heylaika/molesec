import logging
import os

from apscheduler.triggers.cron import CronTrigger
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        """Running code after apps are ready.

        Scheduler should be imported and start after apps are loaded.
        Otherwise, AppRegistryNotReady error would be raised.

        """
        from core.coordinators.attack_coordinator import (  # noqa pylint: disable=import-outside-toplevel
            monitor_attacks,
        )
        from core.scheduler import (  # noqa pylint: disable=import-outside-toplevel
            scheduler,
        )

        # Only start the scheduler if running with the prod ready server
        # (see the Procfile) or if running with the dev server
        # (manage.py runserver). This prevents the scheduler from
        # starting twice in manage.py when running in dev mode and from
        # running during releases. SERVER_SOFTWARE and RUN_MAIN are set
        # by gunicorn and the dev server respectively.
        if (
            "gunicorn" in os.environ.get("SERVER_SOFTWARE", "")
            or os.environ.get("RUN_MAIN") == "true"
        ):
            logging.info("Starting scheduler...")
            scheduler.start()

            scheduler.add_job(
                monitor_attacks, trigger=CronTrigger(second="*/10"), id="attacks"
            )

"""Scheduler for the application.

A - probably - temporary solution to run background tasks before having
to move to Celery.

USAGE

You can use this to setup recurring jobs, in  ore/apps.py use the
"ready" method to setup recurring jobs.

scheduler.add_job(
    your_function, trigger=CronTrigger(second="*/10"),id="_test")

Or add one off jobs on the fly:
core_utils.scheduler.add_job(your_function)

If you are setting up recurring jobs, said jobs should be added at the
start of the application, which, in this "janky" way of having a
scheduler, usually means on import of a module.

DIRTY DETAILS

In case you need to change things like the threading model and what not.
There are a few caveats in running a scheduler this way, the "more
serious" alternative would be to run a separate application on heroku or
a separate process that runs a management command, but that has other
caveats so let's see where this goes.

Note, because of this, the server should only run single process (see
the Procfile).

Informative thread about the how/why/what
https://stackoverflow.com/questions/16053364/make-sure-only-one-worker-launches-the-apscheduler-event-in-a-pyramid-web-app-ru

This was a nice to have to keep track of jobs through the django admin
panel, but their job store wasn't playing nice when running the
scheduler like this, the thread was getting blocked.
https://github.com/jcass77/django-apscheduler


"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings


def instantiate():
    """Instantiate scheduler."""

    if settings.USE_SCHEDULER:
        scheduler_instance = BackgroundScheduler(
            job_defaults={
                "misfire_grace_time": 2**31,
                "coalesce": False,
                "max_instances": 1,
            },
        )
        logging.getLogger("apscheduler").setLevel(settings.SCHEDULER_LOG_LEVEL)

    else:

        class SchedulerMock:
            def add_job(self, *args, **kwargs):
                pass

            def remove_job(self, *args, **kwargs):
                pass

            def start(self, *args, **kwargs):
                pass

        scheduler_instance = SchedulerMock()

    return scheduler_instance


scheduler = instantiate()


__all__ = ["scheduler"]

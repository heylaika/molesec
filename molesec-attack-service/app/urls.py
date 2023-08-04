from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core import api as core_api
from core import views as core_views


def version(route: str):
    return f"api/v1{route}"


urlpatterns = [
    # Django admin.
    path("admin/", admin.site.urls),
    # API schema.
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # Objectives
    path(version("/objectives"), core_api.CreateObjective.as_view()),
    path(version("/objectives/<uuid:objective_id>"), core_api.Objectives.as_view()),
    # Attacks
    path(
        version("/objectives/<uuid:objective_id>/attacks"),
        core_api.AttackList.as_view(),
    ),
    # Attack
    path(
        version("/attacks/<uuid:attack_id>"),
        core_api.AttackObject.as_view(),
    ),
    # Checks. Currently used to inform the dashboard if the user has
    # configured its email provider correctly. This is required since
    # we decided that email whitelisting is required.
    path(
        version("/checks/domain-delegation-enabled"),
        core_api.DomainDelegationEnabled.as_view(),
    ),
    # Dev endpoints to ease development/testing.
    path("dev/text-generation", core_api.DevTestTextGeneration.as_view()),
    path("dev/send-email", core_api.DevSendEmail.as_view()),
    # Publicly accessible endpoints.
    path(
        version("/phi-token/<str:token>"),
        core_api.ConsumePhishingToken.as_view(),
        name="phi-token",
    ),
    path(
        "email/tracking-pixel.png",
        core_api.ReceiveEmailOpenedEvent.as_view(),
        name="phi-tracking-pixel",
    ),
    # Publicly accessible views.
    path("phi/access", core_views.page_consuming_token_view, name="phi-access"),
    path("login", core_views.github_login_view, name="phi-login"),
]

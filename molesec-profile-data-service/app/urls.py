from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from profile_data import api as pd_api

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
    # User facing APIs.
    path(
        "api/v1/organizations",
        pd_api.OrganizationList.as_view(),
        name="api_v1_organizations",
    ),
    path(
        "api/v1/organizations/<uuid:organization_id>",
        pd_api.OrganizationDetail.as_view(),
        name="api_v1_organizations",
    ),
    path(
        "api/v1/organizations/<uuid:organization_id>/individuals",
        pd_api.IndividualsList.as_view(),
        name="api_v1_individuals",
    ),
]

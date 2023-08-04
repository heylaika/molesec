from django.contrib import admin

from profile_data import models

admin.site.register(models.Organization)
admin.site.register(models.Individual)


class IndividualHandleAdmin(admin.ModelAdmin):
    # Hide the organization column from the user doing data entry,
    # redundant given the individual, needed for some constraints.
    exclude = ("organization",)

    def save_model(self, request, obj, form, change):
        obj.organization = form.cleaned_data["individual"].organization
        super().save_model(request, obj, form, change)


admin.site.register(models.IndividualHandle, IndividualHandleAdmin)

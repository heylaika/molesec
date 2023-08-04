"""Module to abstract interactions with the profile data service."""
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings
from pydantic import UUID4, BaseModel, EmailStr

from core import errors as core_errors
from core import utils as core_utils
from core.types import ProfileData


class _ProfileDataRequest(BaseModel):
    org_id: UUID4
    email: EmailStr


_PROFILE_DATA_URL = settings.PROFILE_DATA_URL
_API_KEY = settings.PROFILE_DATA_API_KEY
_INDIVIDUALS_ENDPOINT = "/api/v1/organizations/{org_id}/individuals"


def get_profile_data(org_id: UUID4, email: EmailStr) -> Optional[ProfileData]:
    """Fetches profile data for a given email address in an org.

    Returns:
        A dictionary with profile data or None if no profile data is
        found.
    """
    _ProfileDataRequest(org_id=org_id, email=email)

    url = f"{_PROFILE_DATA_URL}{_INDIVIDUALS_ENDPOINT.format(org_id=org_id)}"

    params = {"handles__type": "EMAIL", "handles__value": email}
    headers = {"Authorization": f"Api-Key {_API_KEY}"}
    session = core_utils.get_requests_session_with_retries()
    response = session.get(url, params=params, headers=headers)
    try:
        response.raise_for_status()
    except requests.HTTPError as e:
        raise core_errors.ProfileDataError("Failed to fetch profile data.") from e
    data: List[Dict[str, Any]] = response.json()

    if not data:
        return None
    if len(data) > 1:
        raise core_errors.ProfileDataError("Unexpected number of profiles returned.")

    return ProfileData(**data[0])


__all__ = ["get_profile_data"]

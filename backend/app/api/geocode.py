"""Resolves a shortened Google Maps link (maps.app.goo.gl/..., goo.gl/maps/...)
to its real, coordinate-bearing URL.

Why this needs a backend round trip at all: the frontend can parse a
full Maps URL like `.../@22.5645,72.9289,15z` for its lat/lng entirely on
its own (see frontend/lib/google-maps-link.ts). But a *shortened* link only
reveals that URL after an HTTP redirect, and browsers refuse to let
JavaScript read the final URL of a cross-origin redirect (CORS). Following
the redirect here, where CORS doesn't apply, is the only way to expand it.
"""
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import AuthenticatedUser, get_current_user
from app.schemas.geocode import MapsLinkExpandRequest, MapsLinkExpandResponse

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

# Only Google's own maps-link domains are accepted as input. This is not a
# general-purpose URL fetcher: restricting the *starting* host means every
# redirect it follows was produced by Google's own shortener, never an
# attacker-chosen destination, which keeps this endpoint safe from SSRF.
_ALLOWED_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "g.co",
    "google.com",
    "www.google.com",
    "maps.google.com",
}


def _hostname_allowed(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return False
    return host.lower() in _ALLOWED_HOSTS


@router.post("/expand-url", response_model=MapsLinkExpandResponse)
def expand_maps_link(
    payload: MapsLinkExpandRequest,
    _: AuthenticatedUser = Depends(get_current_user),
) -> MapsLinkExpandResponse:
    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    if not _hostname_allowed(url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Google Maps links can be expanded.",
        )

    try:
        with httpx.Client(follow_redirects=True, timeout=6.0) as client:
            response = client.head(url)
            # A handful of short-link redirectors 404/405 on HEAD - fall back
            # to a GET rather than surface a false failure to the user.
            if response.status_code >= 400:
                response = client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not resolve that Maps link. Try pasting the full address-bar URL instead.",
        ) from exc

    return MapsLinkExpandResponse(resolved_url=str(response.url))

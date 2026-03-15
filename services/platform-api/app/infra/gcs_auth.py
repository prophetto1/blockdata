"""GCS OAuth2 token from service account credentials.
Same pattern as supabase/functions/_shared/vertex_auth.ts but in Python.
"""
import json
import time
from typing import Any

import httpx
import jwt  # PyJWT


def get_gcs_access_token(creds: dict[str, Any]) -> str:
    """Exchange a GCP service account credential for a short-lived access token."""
    now = int(time.time())
    payload = {
        "iss": creds["client_email"],
        "scope": "https://www.googleapis.com/auth/devstorage.read_only",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    signed_jwt = jwt.encode(payload, creds["private_key"], algorithm="RS256")

    resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed_jwt,
    }, timeout=10)
    resp.raise_for_status()
    return resp.json()["access_token"]

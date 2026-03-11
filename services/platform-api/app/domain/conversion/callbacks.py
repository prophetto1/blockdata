"""Conversion callback handling."""

from typing import Any

from app.infra.http_client import post_callback


async def send_conversion_callback(
    callback_url: str,
    shared_secret: str,
    payload: dict[str, Any],
) -> None:
    """Best-effort callback POST."""
    try:
        await post_callback(callback_url, payload, shared_secret)
    except Exception:
        pass  # Best-effort; pg_cron TTL will mark conversion_failed

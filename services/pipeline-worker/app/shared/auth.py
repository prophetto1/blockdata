"""Credential resolution — fetch secrets from environment or Supabase vault."""

import os
from typing import Any


async def resolve_credentials(
    auth_config: dict[str, Any], context: "ExecutionContext | None" = None
) -> dict[str, str]:
    """
    Resolve authentication credentials from config.

    Supports:
      - type: BASIC → returns {"username": ..., "password": ...}
      - type: BEARER → returns {"token": ...}
      - type: API_KEY → returns {"header": ..., "value": ...}

    Values prefixed with ${{ }} are resolved from context variables,
    values prefixed with $ENV. are resolved from environment.
    """
    auth_type = auth_config.get("type", "").upper()
    result: dict[str, str] = {"type": auth_type}

    for key, value in auth_config.items():
        if key == "type":
            continue
        result[key] = await _resolve_value(str(value), context)

    return result


async def _resolve_value(value: str, context: Any = None) -> str:
    if value.startswith("$ENV."):
        env_key = value[5:]
        return os.environ.get(env_key, "")
    if value.startswith("${{") and value.endswith("}}") and context:
        expr = value[3:-2].strip()
        return context.render(f"{{{{ {expr} }}}}")
    return value

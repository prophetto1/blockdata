"""Output formatting utilities."""

from typing import Any

from .base import PluginOutput


def success(data: dict[str, Any] | None = None, logs: list[str] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="SUCCESS", logs=logs or [])


def failed(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="FAILED", logs=[message])


def warning(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="WARNING", logs=[message])

"""Core plugins — Log, flow control, sleep, state, storage."""

import asyncio
import logging
from typing import Any

from ..shared.base import BasePlugin, PluginOutput
from ..shared import output as out


class LogPlugin(BasePlugin):
    """Logs a message. Equivalent to io.kestra.plugin.core.log.Log."""

    task_types = [
        "io.kestra.plugin.core.log.Log",
        "io.kestra.core.tasks.log.Log",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        message = params.get("message", "")
        if isinstance(message, str):
            message = context.render(message)
        elif isinstance(message, list):
            message = [context.render(m) for m in message]

        level_name = params.get("level", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)

        messages = message if isinstance(message, list) else [message]
        for msg in messages:
            context.logger.log(level, msg)

        return out.success(logs=messages)

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "message", "type": "string", "required": True, "description": "Message to log. Supports {{ expressions }}."},
            {"name": "level", "type": "string", "required": False, "default": "INFO", "values": ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]},
        ]


class SleepPlugin(BasePlugin):
    """Pauses execution. Equivalent to io.kestra.plugin.core.flow.Sleep."""

    task_types = [
        "io.kestra.plugin.core.flow.Sleep",
        "io.kestra.core.tasks.flows.Sleep",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        duration = params.get("duration", "PT1S")
        seconds = _parse_iso_duration(duration)
        context.logger.info(f"Sleeping for {seconds}s")
        await asyncio.sleep(seconds)
        return out.success(data={"duration_seconds": seconds}, logs=[f"Slept {seconds}s"])

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "duration", "type": "string", "required": False, "default": "PT1S", "description": "ISO 8601 duration (e.g. PT5S, PT1M)"},
        ]


class PausePlugin(BasePlugin):
    """Signals the orchestrator to pause. Equivalent to io.kestra.plugin.core.flow.Pause."""

    task_types = [
        "io.kestra.plugin.core.flow.Pause",
        "io.kestra.core.tasks.flows.Pause",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        return PluginOutput(state="PAUSED", data={"reason": "Manual pause requested"}, logs=["Execution paused"])

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "delay", "type": "string", "required": False, "description": "Optional ISO 8601 duration before auto-resume"},
        ]


class IfPlugin(BasePlugin):
    """Evaluates a condition and returns the branch to take."""

    task_types = [
        "io.kestra.plugin.core.flow.If",
        "io.kestra.core.tasks.flows.If",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        condition = params.get("condition", "false")
        rendered = context.render(str(condition))

        # Evaluate truthiness
        result = rendered.lower() not in ("false", "0", "", "null", "none", "no")

        branch = "then" if result else "else"
        context.logger.info(f"If condition '{condition}' → {rendered} → branch: {branch}")
        return out.success(data={"branch": branch, "evaluation_result": result})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "condition", "type": "string", "required": True, "description": "Expression to evaluate. Supports {{ expressions }}."},
        ]


class SwitchPlugin(BasePlugin):
    """Matches a value to cases and returns the matching branch."""

    task_types = [
        "io.kestra.plugin.core.flow.Switch",
        "io.kestra.core.tasks.flows.Switch",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        value = context.render(str(params.get("value", "")))
        cases = params.get("cases", {})

        if value in cases:
            branch = value
        else:
            branch = "defaults"

        context.logger.info(f"Switch '{value}' → branch: {branch}")
        return out.success(data={"branch": branch, "value": value})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "value", "type": "string", "required": True, "description": "Value to match against cases."},
            {"name": "cases", "type": "object", "required": True, "description": "Map of case keys to task lists."},
        ]


class ForEachPlugin(BasePlugin):
    """Returns iteration plan for the orchestrator to fan out."""

    task_types = [
        "io.kestra.plugin.core.flow.ForEach",
        "io.kestra.core.tasks.flows.EachSequential",
        "io.kestra.core.tasks.flows.EachParallel",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        values = params.get("values", [])
        if isinstance(values, str):
            rendered = context.render(values)
            # Try to parse as JSON array
            import json
            try:
                values = json.loads(rendered)
            except (json.JSONDecodeError, TypeError):
                values = [v.strip() for v in rendered.split(",")]

        concurrency = params.get("concurrencyLimit", 0)  # 0 = unlimited

        context.logger.info(f"ForEach over {len(values)} items (concurrency={concurrency})")
        return out.success(data={
            "items": values,
            "count": len(values),
            "concurrency": concurrency,
        })

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "values", "type": "array", "required": True, "description": "List to iterate over, or {{ expression }} returning a list."},
            {"name": "concurrencyLimit", "type": "integer", "required": False, "default": 0, "description": "Max concurrent executions (0=unlimited)."},
        ]


class ParallelPlugin(BasePlugin):
    """Signals the orchestrator to run child tasks in parallel."""

    task_types = [
        "io.kestra.plugin.core.flow.Parallel",
        "io.kestra.core.tasks.flows.Parallel",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        concurrent = params.get("concurrent", 0)
        context.logger.info(f"Parallel execution requested (concurrent={concurrent})")
        return out.success(data={"concurrent": concurrent, "mode": "parallel"})


class SequentialPlugin(BasePlugin):
    """Signals the orchestrator to run child tasks sequentially."""

    task_types = [
        "io.kestra.plugin.core.flow.Sequential",
        "io.kestra.core.tasks.flows.Sequential",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        return out.success(data={"mode": "sequential"})


# --- Helpers ---

def _parse_iso_duration(duration: str) -> float:
    """Parse a subset of ISO 8601 durations: PT5S, PT1M, PT1H, PT1M30S."""
    import re
    total = 0.0
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?", duration, re.IGNORECASE)
    if match:
        hours, minutes, seconds = match.groups()
        if hours:
            total += float(hours) * 3600
        if minutes:
            total += float(minutes) * 60
        if seconds:
            total += float(seconds)
    return total or 1.0

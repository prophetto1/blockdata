from __future__ import annotations

import importlib
from typing import Any

from runtime.execution_backend import ExecutionBackend
from runtime.execution_result import ExecutionResult


class InspectBackend(ExecutionBackend):
    def __init__(self, *, provider: str, model: str) -> None:
        self._provider = provider
        self._model = model
        (
            self._get_model,
            self._generate_config_cls,
            self._system_message_cls,
            self._assistant_message_cls,
            self._user_message_cls,
        ) = _load_inspect_components()
        self._runtime_model = self._get_model(
            f"{provider}/{model}",
            config=self._generate_config_cls(temperature=0.0, max_tokens=4096),
        )

    async def execute(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> ExecutionResult:
        inspect_messages = [
            _to_inspect_message(
                msg,
                self._system_message_cls,
                self._assistant_message_cls,
                self._user_message_cls,
            )
            for msg in messages
        ]
        output = await self._runtime_model.generate(
            inspect_messages,
            config=self._generate_config_cls(temperature=temperature, max_tokens=max_tokens),
        )
        usage = _map_usage(getattr(output, "usage", None))
        timing = getattr(output, "time", None)
        return ExecutionResult(
            response_text=getattr(output, "completion", "") or "",
            backend="inspect",
            model_name=getattr(output, "model", None),
            provider=self._provider,
            usage=usage,
            timing_ms=(timing * 1000.0) if timing is not None else None,
        )


def _load_inspect_components() -> tuple[Any, type[Any], type[Any], type[Any], type[Any]]:
    try:
        module = importlib.import_module("inspect_ai.model")
    except ImportError as exc:
        raise ImportError(
            "inspect_ai package required for inspect backend. Install with: pip install inspect-ai"
        ) from exc

    return (
        module.get_model,
        module.GenerateConfig,
        module.ChatMessageSystem,
        module.ChatMessageAssistant,
        module.ChatMessageUser,
    )


def _to_inspect_message(
    message: dict[str, str],
    system_message_cls: type[Any],
    assistant_message_cls: type[Any],
    user_message_cls: type[Any],
) -> Any:
    role = message["role"]
    content = message["content"]
    if role == "system":
        return system_message_cls(content=content)
    if role == "assistant":
        return assistant_message_cls(content=content)
    if role == "user":
        return user_message_cls(content=content)
    raise ValueError(f"Unsupported message role for InspectAI backend: {role}")


def _map_usage(usage: Any) -> dict[str, Any] | None:
    if usage is None:
        return None
    return {
        "input_tokens": getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "output_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
        "total_cost": getattr(usage, "total_cost", None),
        "reasoning_tokens": getattr(usage, "reasoning_tokens", None),
    }

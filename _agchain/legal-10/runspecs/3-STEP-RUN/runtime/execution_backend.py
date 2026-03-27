from __future__ import annotations

from abc import ABC, abstractmethod

from adapters.model_adapter import ModelAdapter
from runtime.execution_result import ExecutionResult


class ExecutionBackend(ABC):
    @abstractmethod
    async def execute(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> ExecutionResult:
        raise NotImplementedError


class DirectBackend(ExecutionBackend):
    def __init__(self, adapter: ModelAdapter) -> None:
        self._adapter = adapter

    async def execute(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> ExecutionResult:
        response_text = self._adapter.call_model(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return ExecutionResult(
            response_text=response_text,
            backend="direct",
            model_name=self._adapter.model_name,
            provider=_provider_name(self._adapter),
            usage=None,
            timing_ms=None,
        )


def resolve_backend(
    name: str,
    *,
    provider: str,
    model: str,
    adapter: ModelAdapter | None = None,
) -> ExecutionBackend:
    if name == "direct":
        if adapter is None:
            raise ValueError("Direct backend requires an adapter")
        return DirectBackend(adapter)
    if name == "inspect":
        from runtime.inspect_backend import InspectBackend

        return InspectBackend(provider=provider, model=model)
    raise ValueError(f"Unknown execution backend: {name}")


def _provider_name(adapter: ModelAdapter) -> str | None:
    name = adapter.__class__.__name__
    if name.endswith("Adapter"):
        return name.removesuffix("Adapter").lower()
    return None

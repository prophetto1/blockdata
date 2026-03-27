"""Model adapters for calling OpenAI and Anthropic APIs."""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any


class ModelAdapter(ABC):
    """Abstract base for model API calls."""

    @abstractmethod
    def call_model(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        """Send messages to the model and return raw response text."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...


class OpenAIAdapter(ModelAdapter):
    """Adapter for OpenAI-compatible APIs (GPT-4, etc.)."""

    def __init__(self, model: str = "gpt-4o", api_key: str | None = None, base_url: str | None = None):
        self._model = model
        self._api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self._base_url = base_url
        if not self._api_key:
            raise ValueError("OPENAI_API_KEY not set")

    @property
    def model_name(self) -> str:
        return self._model

    def call_model(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai")

        client = OpenAI(api_key=self._api_key, base_url=self._base_url)
        response = client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""


class AnthropicAdapter(ModelAdapter):
    """Adapter for Anthropic API (Claude)."""

    def __init__(self, model: str = "claude-sonnet-4-5-20250929", api_key: str | None = None):
        self._model = model
        self._api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        if not self._api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

    @property
    def model_name(self) -> str:
        return self._model

    def call_model(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        try:
            from anthropic import Anthropic
        except ImportError:
            raise ImportError("anthropic package required. Install with: pip install anthropic")

        client = Anthropic(api_key=self._api_key)

        # Anthropic API: system message goes in 'system' param, not in messages
        system_msg = ""
        api_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                api_messages.append(msg)

        response = client.messages.create(
            model=self._model,
            system=system_msg,
            messages=api_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.content[0].text if response.content else ""


def create_adapter(
    provider: str,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> ModelAdapter:
    """Factory for creating model adapters."""
    if provider == "openai":
        return OpenAIAdapter(model=model or "gpt-4o", api_key=api_key, base_url=base_url)
    elif provider == "anthropic":
        return AnthropicAdapter(model=model or "claude-sonnet-4-5-20250929", api_key=api_key)
    else:
        raise ValueError(f"Unknown provider: {provider}. Use 'openai' or 'anthropic'.")

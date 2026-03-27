from __future__ import annotations

from copy import deepcopy
from typing import Any


_PROVIDERS: list[dict[str, Any]] = [
    {
        "provider_slug": "openai",
        "display_name": "OpenAI",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "oauth"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "tools": True, "json": True},
        "supports_model_args": True,
        "notes": "Supports OpenAI native endpoints and compatible Azure/OpenAI-style base URLs.",
    },
    {
        "provider_slug": "openai-api",
        "display_name": "OpenAI Compatible",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "none", "custom"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "tools": True, "json": True},
        "supports_model_args": True,
        "notes": "Generic OpenAI-compatible API targets such as gateways and local servers.",
    },
    {
        "provider_slug": "anthropic",
        "display_name": "Anthropic",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "oauth"],
        "default_probe_strategy": "http_anthropic_models",
        "default_capabilities": {"chat": True, "tools": True, "reasoning": True},
        "supports_model_args": True,
        "notes": "Anthropic native or hosted compatible deployments.",
    },
    {
        "provider_slug": "google",
        "display_name": "Google",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "service_account", "oauth"],
        "default_probe_strategy": "http_google_models",
        "default_capabilities": {"chat": True, "vision": True, "json": True},
        "supports_model_args": True,
        "notes": "Google AI Studio and Vertex-like Gemini targets.",
    },
    {
        "provider_slug": "azureai",
        "display_name": "Azure AI",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "oauth", "service_account"],
        "default_probe_strategy": "custom_http",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "Azure AI Foundry and Azure-hosted inference endpoints.",
    },
    {
        "provider_slug": "bedrock",
        "display_name": "AWS Bedrock",
        "supports_custom_base_url": False,
        "supported_auth_kinds": ["service_account", "custom"],
        "default_probe_strategy": "none",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "AWS-authenticated Bedrock targets.",
    },
    {
        "provider_slug": "openrouter",
        "display_name": "OpenRouter",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "tools": True, "json": True},
        "supports_model_args": True,
        "notes": "OpenRouter routed models.",
    },
    {
        "provider_slug": "ollama",
        "display_name": "Ollama",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["none", "api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "tools": True, "local": True},
        "supports_model_args": True,
        "notes": "Local or remote Ollama OpenAI-compatible endpoints.",
    },
    {
        "provider_slug": "vllm",
        "display_name": "vLLM",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["none", "api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "tools": True, "local": True},
        "supports_model_args": True,
        "notes": "vLLM servers exposed through an OpenAI-compatible API.",
    },
    {
        "provider_slug": "groq",
        "display_name": "Groq",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "Groq-hosted inference endpoints.",
    },
    {
        "provider_slug": "mistral",
        "display_name": "Mistral",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "custom_http",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "Mistral native endpoints or compatible deployments.",
    },
    {
        "provider_slug": "hf",
        "display_name": "Hugging Face",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key", "none"],
        "default_probe_strategy": "custom_http",
        "default_capabilities": {"chat": True, "local": True},
        "supports_model_args": True,
        "notes": "Hugging Face local or hosted model integrations.",
    },
    {
        "provider_slug": "together",
        "display_name": "Together AI",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "Together AI endpoints.",
    },
    {
        "provider_slug": "fireworks",
        "display_name": "Fireworks AI",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "Fireworks AI endpoints.",
    },
    {
        "provider_slug": "sambanova",
        "display_name": "SambaNova",
        "supports_custom_base_url": True,
        "supported_auth_kinds": ["api_key"],
        "default_probe_strategy": "http_openai_models",
        "default_capabilities": {"chat": True, "json": True},
        "supports_model_args": True,
        "notes": "SambaNova-hosted inference endpoints.",
    },
]


def list_supported_providers() -> list[dict[str, Any]]:
    return [deepcopy(provider) for provider in _PROVIDERS]


def resolve_provider_definition(provider_slug: str) -> dict[str, Any] | None:
    normalized = (provider_slug or "").strip().lower()
    for provider in _PROVIDERS:
        if provider["provider_slug"] == normalized:
            return deepcopy(provider)
    return None

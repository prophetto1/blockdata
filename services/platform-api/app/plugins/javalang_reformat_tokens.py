"""Javalang reformat-tokens plugin."""

from __future__ import annotations

from typing import Any

import javalang

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.plugins.javalang_base import _require_string, _serialize_token


class JavalangReformatTokensPlugin(BasePlugin):
    task_types = ["blockdata.javalang.reformat_tokens"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        code = _require_string(params, "code")
        ignore_errors = bool(params.get("ignore_errors", False))
        tokens = list(javalang.tokenizer.tokenize(code, ignore_errors=ignore_errors))
        text = javalang.tokenizer.reformat_tokens(tokens)
        return out.success(data={"text": text, "token_count": len(tokens)})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "code", "type": "string", "required": True, "description": "Java source text."},
            {"name": "ignore_errors", "type": "boolean", "required": False, "default": False},
        ]
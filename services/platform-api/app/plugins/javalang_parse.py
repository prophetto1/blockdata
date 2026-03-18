"""Javalang parse plugin — full compilation unit."""

from __future__ import annotations

from typing import Any

import javalang

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.plugins.javalang_base import _require_string, _serialize_ast


class JavalangParsePlugin(BasePlugin):
    task_types = ["blockdata.javalang.parse"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        code = _require_string(params, "code")
        ast = javalang.parse.parse(code)
        return out.success(data={"ast": _serialize_ast(ast)})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "code", "type": "string", "required": True, "description": "Java source text to parse."},
        ]
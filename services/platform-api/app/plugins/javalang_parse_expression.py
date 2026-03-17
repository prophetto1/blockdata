"""Javalang parse-expression plugin."""

from __future__ import annotations

from typing import Any

import javalang

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.plugins.javalang_base import _require_string, _serialize_ast


class JavalangParseExpressionPlugin(BasePlugin):
    task_types = ["blockdata.javalang.parse_expression"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        expression = _require_string(params, "expression")
        ast = javalang.parse.parse_expression(expression)
        return out.success(data={"ast": _serialize_ast(ast)})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "expression", "type": "string", "required": True, "description": "Java expression to parse."},
        ]
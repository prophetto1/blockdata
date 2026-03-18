"""Javalang parse-type plugin."""

from __future__ import annotations

from typing import Any

import javalang

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.plugins.javalang_base import _require_string, _serialize_ast


class JavalangParseTypePlugin(BasePlugin):
    task_types = ["blockdata.javalang.parse_type"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        type_source = _require_string(params, "type_source")
        ast = javalang.parse.parse_type(type_source)
        return out.success(data={"ast": _serialize_ast(ast)})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "type_source", "type": "string", "required": True, "description": "Java type to parse."},
        ]
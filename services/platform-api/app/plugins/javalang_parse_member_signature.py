"""Javalang parse-member-signature plugin."""

from __future__ import annotations

from typing import Any

import javalang

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.plugins.javalang_base import _require_string, _serialize_ast


class JavalangParseMemberSignaturePlugin(BasePlugin):
    task_types = ["blockdata.javalang.parse_member_signature"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        signature = _require_string(params, "signature")
        ast = javalang.parse.parse_member_signature(signature)
        return out.success(data={"ast": _serialize_ast(ast)})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "signature", "type": "string", "required": True, "description": "Java member signature to parse."},
        ]
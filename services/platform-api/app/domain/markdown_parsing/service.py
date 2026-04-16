"""Parse Markdown source into mdast JSON through a Node remark runner."""

import asyncio
import os
from pathlib import Path

from pydantic import BaseModel

from app.domain.conversion.models import is_markdown_source_type


class MarkdownParseResult(BaseModel):
    mdast_json: bytes
    markdown_bytes: bytes
    source_type: str


def _resolve_node_bin() -> str:
    return os.environ.get("PLATFORM_PARSE_NODE_BIN", "node").strip() or "node"


def _remark_runner_path() -> Path:
    return Path(__file__).with_name("remark_runner.mjs")


async def _run_remark_runner(source_bytes: bytes) -> bytes:
    runner_path = _remark_runner_path()
    try:
        proc = await asyncio.create_subprocess_exec(
            _resolve_node_bin(),
            str(runner_path),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Node runtime not found for Markdown parser runner") from exc

    stdout, stderr = await proc.communicate(source_bytes)
    if proc.returncode != 0:
        detail = stderr.decode("utf-8", errors="replace").strip() or "unknown runner error"
        raise RuntimeError(f"Markdown parser runner failed: {detail}")

    payload = stdout.strip()
    if not payload:
        raise RuntimeError("Markdown parser runner returned no AST payload")
    return payload


async def parse_markdown_source(source_bytes: bytes, source_type: str) -> MarkdownParseResult:
    if not is_markdown_source_type(source_type):
        raise ValueError(f"Unsupported Markdown source type: {source_type}")

    mdast_json = await _run_remark_runner(source_bytes)
    return MarkdownParseResult(
        mdast_json=mdast_json,
        markdown_bytes=source_bytes,
        source_type=source_type,
    )

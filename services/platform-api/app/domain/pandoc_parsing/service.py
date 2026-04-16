"""Parse alpha document formats into Pandoc AST JSON."""

import asyncio
import os

from pydantic import BaseModel

from app.domain.conversion.models import is_pandoc_source_type

PANDOC_INPUT_FORMATS = {
    "rst": "rst",
    "latex": "latex",
    "tex": "latex",
    "rtf": "rtf",
    "org": "org",
    "asciidoc": "asciidoc",
}
PANDOC_ENABLED_VALUES = {"1", "true", "yes", "on"}


class PandocUnavailableError(RuntimeError):
    """Raised when the alpha pandoc lane is not available."""


class PandocParseResult(BaseModel):
    pandoc_ast_json: bytes
    source_type: str
    input_format: str


def _pandoc_enabled() -> bool:
    value = os.environ.get("PLATFORM_PARSE_PANDOC_ENABLED", "").strip().lower()
    return value in PANDOC_ENABLED_VALUES


def _resolve_pandoc_bin() -> str:
    return os.environ.get("PLATFORM_PARSE_PANDOC_BIN", "pandoc").strip() or "pandoc"


def _pandoc_input_format(source_type: str) -> str:
    try:
        return PANDOC_INPUT_FORMATS[source_type]
    except KeyError as exc:
        raise ValueError(f"Unsupported Pandoc source type: {source_type}") from exc


async def _run_pandoc(source_bytes: bytes, input_format: str) -> bytes:
    if not _pandoc_enabled():
        raise PandocUnavailableError("Pandoc alpha parse lane is disabled")

    try:
        proc = await asyncio.create_subprocess_exec(
            _resolve_pandoc_bin(),
            "--from",
            input_format,
            "--to",
            "json",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise PandocUnavailableError("Pandoc binary not found for alpha parse lane") from exc

    stdout, stderr = await proc.communicate(source_bytes)
    if proc.returncode != 0:
        detail = stderr.decode("utf-8", errors="replace").strip() or "unknown pandoc error"
        raise RuntimeError(f"Pandoc parse failed: {detail}")

    payload = stdout.strip()
    if not payload:
        raise RuntimeError("Pandoc parse returned no AST payload")
    return payload


async def parse_pandoc_source(source_bytes: bytes, source_type: str) -> PandocParseResult:
    if not is_pandoc_source_type(source_type):
        raise ValueError(f"Unsupported Pandoc source type: {source_type}")

    input_format = _pandoc_input_format(source_type)
    pandoc_ast_json = await _run_pandoc(source_bytes, input_format)
    return PandocParseResult(
        pandoc_ast_json=pandoc_ast_json,
        source_type=source_type,
        input_format=input_format,
    )

"""Direct DB writes for conversion artifacts — used by tree-sitter track.

Uses the existing get_supabase_admin() singleton from app/infra/supabase_client.py.
The Docling track does NOT use this module — it persists via the
conversion-complete edge function callback.
"""

import hashlib
from typing import Any, Optional

from app.infra.supabase_client import get_supabase_admin


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _build_conv_uid(parsing_tool: str, representation_type: str, artifact_bytes: bytes) -> str:
    """Build a deterministic conv_uid matching the pattern used elsewhere."""
    digest = hashlib.sha256()
    digest.update(f"{parsing_tool}\n{representation_type}\n".encode())
    digest.update(artifact_bytes)
    return digest.hexdigest()


def insert_representation(
    source_uid: str,
    parsing_tool: str,
    representation_type: str,
    artifact_locator: str,
    artifact_bytes: bytes,
    artifact_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Insert a conversion_representations row."""
    sb = get_supabase_admin()
    sb.table("conversion_representations").upsert(
        {
            "source_uid": source_uid,
            "parsing_tool": parsing_tool,
            "representation_type": representation_type,
            "conv_uid": _build_conv_uid(parsing_tool, representation_type, artifact_bytes),
            "artifact_locator": artifact_locator,
            "artifact_hash": _sha256_hex(artifact_bytes),
            "artifact_size_bytes": len(artifact_bytes),
            "artifact_meta": artifact_meta or {},
        },
        on_conflict="conv_uid,representation_type",
    ).execute()


def mark_source_status(
    source_uid: str,
    status: str,
    error: Optional[str] = None,
    conversion_job_id: Optional[str] = None,
) -> None:
    """Update source_documents.status (and optionally conversion_job_id)."""
    sb = get_supabase_admin()
    update: dict[str, Any] = {"status": status}
    if error is not None:
        update["error"] = error
    if conversion_job_id is not None:
        update["conversion_job_id"] = conversion_job_id
    sb.table("source_documents").update(update).eq("source_uid", source_uid).execute()


def upsert_conversion_parsing(
    source_uid: str,
    conv_parsing_tool: str,
    conv_status: str = "success",
    pipeline_config: Optional[dict[str, Any]] = None,
    parser_runtime_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Upsert a conversion_parsing row for the source document."""
    sb = get_supabase_admin()
    sb.table("conversion_parsing").upsert(
        {
            "source_uid": source_uid,
            "conv_parsing_tool": conv_parsing_tool,
            "conv_status": conv_status,
            "pipeline_config": pipeline_config or {},
            "parser_runtime_meta": parser_runtime_meta or {},
        },
        on_conflict="source_uid",
    ).execute()

"""Direct DB writes for conversion artifacts.

Uses the existing get_supabase_admin() singleton from app/infra/supabase_client.py.
Both tree-sitter and Platform API owned Docling parses use this module.
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


def build_representation_artifact_hash(
    parsing_tool: str,
    representation_type: str,
    artifact_bytes: bytes,
) -> str:
    """Build the prefixed artifact hash used by Docling representations."""
    return _build_conv_uid(parsing_tool, representation_type, artifact_bytes)


def insert_representation_record(
    source_uid: str,
    conv_uid: str,
    parsing_tool: str,
    representation_type: str,
    artifact_locator: str,
    artifact_hash: str,
    artifact_size_bytes: int,
    artifact_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Insert a conversion_representations row with explicit hash metadata."""
    sb = get_supabase_admin()
    sb.table("conversion_representations").upsert(
        {
            "source_uid": source_uid,
            "parsing_tool": parsing_tool,
            "representation_type": representation_type,
            "conv_uid": conv_uid,
            "artifact_locator": artifact_locator,
            "artifact_hash": artifact_hash,
            "artifact_size_bytes": artifact_size_bytes,
            "artifact_meta": artifact_meta or {},
        },
        on_conflict="conv_uid,representation_type",
    ).execute()


def insert_representation(
    source_uid: str,
    conv_uid: str,
    parsing_tool: str,
    representation_type: str,
    artifact_locator: str,
    artifact_bytes: bytes,
    artifact_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Insert a conversion_representations row."""
    insert_representation_record(
        source_uid=source_uid,
        conv_uid=conv_uid,
        parsing_tool=parsing_tool,
        representation_type=representation_type,
        artifact_locator=artifact_locator,
        artifact_hash=_sha256_hex(artifact_bytes),
        artifact_size_bytes=len(artifact_bytes),
        artifact_meta=artifact_meta,
    )


def mark_source_status(
    source_uid: str,
    status: str,
    error: Optional[str] = None,
    conversion_job_id: Optional[str] = None,
    clear_error: bool = False,
) -> None:
    """Update source_documents.status (and optionally conversion_job_id)."""
    sb = get_supabase_admin()
    update: dict[str, Any] = {"status": status}
    if error is not None:
        update["error"] = error
    elif clear_error:
        update["error"] = None
    if conversion_job_id is not None:
        update["conversion_job_id"] = conversion_job_id
    sb.table("source_documents").update(update).eq("source_uid", source_uid).execute()


def clear_conversion_state_for_source(
    source_uid: str,
    *,
    parsing_tool: Optional[str] = None,
) -> None:
    """Delete conversion rows for a source so a reparse starts from one current run."""
    sb = get_supabase_admin()

    existing_parsing = (
        sb.table("conversion_parsing")
        .select("conv_uid")
        .eq("source_uid", source_uid)
        .maybe_single()
        .execute()
    )
    existing_conv_uid = (existing_parsing.data or {}).get("conv_uid")
    if existing_conv_uid:
        sb.table("blocks").delete().eq("conv_uid", existing_conv_uid).execute()

    representations_delete = sb.table("conversion_representations").delete().eq(
        "source_uid", source_uid
    )
    if parsing_tool:
        representations_delete = representations_delete.eq("parsing_tool", parsing_tool)
    representations_delete.execute()

    sb.table("conversion_parsing").delete().eq("source_uid", source_uid).execute()


def upsert_conversion_parsing(
    source_uid: str,
    conv_parsing_tool: str,
    conv_status: str = "success",
    pipeline_config: Optional[dict[str, Any]] = None,
    parser_runtime_meta: Optional[dict[str, Any]] = None,
    *,
    conv_uid: Optional[str] = None,
    conv_locator: Optional[str] = None,
    conv_total_blocks: Optional[int] = None,
    conv_total_characters: Optional[int] = None,
    conv_representation_type: Optional[str] = None,
    conv_block_type_freq: Optional[dict[str, int]] = None,
    requested_pipeline_config: Optional[dict[str, Any]] = None,
    applied_pipeline_config: Optional[dict[str, Any]] = None,
) -> None:
    """Upsert a conversion_parsing row for the source document."""
    sb = get_supabase_admin()
    # conv_uid is NOT NULL — generate a deterministic hash if not provided.
    effective_conv_uid = conv_uid or _sha256_hex(
        f"{conv_parsing_tool}\n{source_uid}".encode()
    )
    row: dict[str, Any] = {
        "source_uid": source_uid,
        "conv_uid": effective_conv_uid,
        "conv_parsing_tool": conv_parsing_tool,
        "conv_status": conv_status,
        "pipeline_config": pipeline_config or {},
        "parser_runtime_meta": parser_runtime_meta or {},
    }
    if conv_locator is not None:
        row["conv_locator"] = conv_locator
    if conv_total_blocks is not None:
        row["conv_total_blocks"] = conv_total_blocks
    if conv_total_characters is not None:
        row["conv_total_characters"] = conv_total_characters
    if conv_representation_type is not None:
        row["conv_representation_type"] = conv_representation_type
    if conv_block_type_freq is not None:
        row["conv_block_type_freq"] = conv_block_type_freq
    if requested_pipeline_config is not None:
        row["requested_pipeline_config"] = requested_pipeline_config
    if applied_pipeline_config is not None:
        row["applied_pipeline_config"] = applied_pipeline_config
    sb.table("conversion_parsing").upsert(
        row,
        on_conflict="source_uid",
    ).execute()


def upsert_blocks(conv_uid: str, blocks: list[dict[str, Any]]) -> None:
    """Upsert Docling-derived block rows for a conversion run."""
    if not blocks:
        raise ValueError("No blocks extracted from docling conversion")

    rows = []
    for idx, block in enumerate(blocks):
        locator: dict[str, Any] = {
            "type": "docling_json_pointer",
            "pointer": block["pointer"],
            "parser_block_type": block["parser_block_type"],
            "parser_path": block["parser_path"],
        }
        if block.get("page_no") is not None:
            locator["page_no"] = block["page_no"]
        if block.get("page_nos"):
            locator["page_nos"] = block["page_nos"]

        rows.append(
            {
                "block_uid": f"{conv_uid}:{idx}",
                "conv_uid": conv_uid,
                "block_index": idx,
                "block_type": block["block_type"],
                "block_locator": locator,
                "block_content": block["block_content"],
            }
        )

    sb = get_supabase_admin()
    sb.table("blocks").upsert(rows, on_conflict="block_uid").execute()

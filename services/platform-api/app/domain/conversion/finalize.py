"""Shared finalization helpers for parse completion."""

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any

from app.domain.conversion.models import ConversionCallbackRequest
from app.domain.conversion.repository import (
    build_representation_artifact_hash,
    clear_conversion_state_for_source,
    insert_representation_record,
    mark_source_status,
    upsert_blocks,
    upsert_conversion_parsing,
)
from app.infra.supabase_client import get_supabase_admin

DOCUMENTS_BUCKET = os.environ.get("DOCUMENTS_BUCKET", "documents")


@dataclass
class FinalizeCallbackError(Exception):
    message: str
    status_code: int = 400

    def __str__(self) -> str:
        return self.message


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _download_storage_bytes(sb, bucket: str, key: str) -> bytes:
    payload = sb.storage.from_(bucket).download(key)
    if isinstance(payload, bytes):
        return payload
    if isinstance(payload, bytearray):
        return bytes(payload)
    if hasattr(payload, "read"):
        return payload.read()
    if hasattr(payload, "content"):
        return payload.content
    raise FinalizeCallbackError(f"Unsupported storage payload type for {key}", 500)


def _resolve_applied_config(
    pipeline_config: dict[str, Any] | None,
    applied_pipeline_config: dict[str, Any] | None,
    parser_runtime_meta: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    requested = pipeline_config or {}
    return (
        requested,
        applied_pipeline_config or requested,
        parser_runtime_meta or {},
    )


def _insert_supplemental_representation(
    *,
    source_uid: str,
    conv_uid: str,
    source_type: str,
    key: str,
    representation_type: str,
    sb,
    artifact_bytes: bytes | None = None,
) -> None:
    bytes_payload = artifact_bytes or _download_storage_bytes(sb, DOCUMENTS_BUCKET, key)
    insert_representation_record(
        source_uid=source_uid,
        conv_uid=conv_uid,
        parsing_tool="docling",
        representation_type=representation_type,
        artifact_locator=key,
        artifact_hash=build_representation_artifact_hash(
            "docling",
            representation_type,
            bytes_payload,
        ),
        artifact_size_bytes=len(bytes_payload),
        artifact_meta={"source_type": source_type, "role": "supplemental"},
    )


async def finalize_docling_callback(
    body: ConversionCallbackRequest,
    sb=None,
    artifact_bytes_by_type: dict[str, bytes] | None = None,
    enforce_conversion_job_match: bool = True,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()

    source_uid = body.source_uid.strip()
    conversion_job_id = body.conversion_job_id.strip()
    md_key = body.md_key.strip()
    docling_key = (body.docling_key or "").strip()
    html_key = (body.html_key or "").strip()
    doctags_key = (body.doctags_key or "").strip()

    if not source_uid or not conversion_job_id or not md_key:
        raise FinalizeCallbackError(
            "Missing source_uid, conversion_job_id, or md_key",
            400,
        )

    doc = (
        sb.table("source_documents")
        .select(
            "source_uid, owner_id, project_id, source_type, source_locator, "
            "conversion_job_id, status"
        )
        .eq("source_uid", source_uid)
        .maybe_single()
        .execute()
    )
    doc_row = doc.data
    if not doc_row:
        raise FinalizeCallbackError("Document not found", 404)

    existing_conv = (
        sb.table("conversion_parsing")
        .select("conv_uid")
        .eq("source_uid", source_uid)
        .maybe_single()
        .execute()
    )
    existing_conv_uid = (existing_conv.data or {}).get("conv_uid")
    if doc_row.get("status") == "parsed" and existing_conv_uid:
        return {
            "ok": True,
            "noop": True,
            "status": "parsed",
            "conv_uid": existing_conv_uid,
            "representation_types": ["doclingdocument_json", "markdown_bytes"],
            "track": "docling",
        }

    if enforce_conversion_job_match and doc_row.get("conversion_job_id") != conversion_job_id:
        raise FinalizeCallbackError("Stale conversion callback (job id mismatch)", 409)

    if not body.success:
        err_msg = (body.error or "conversion failed").strip()[:1000]
        mark_source_status(source_uid, "conversion_failed", error=err_msg)
        return {"ok": False, "status": "conversion_failed", "error": err_msg}

    if not docling_key:
        err_msg = "Missing docling_key — legacy non-Docling job; re-parse required"
        mark_source_status(source_uid, "conversion_failed", error=err_msg)
        return {
            "ok": False,
            "status": "conversion_failed",
            "error": err_msg,
            "drain": True,
        }

    callback_blocks = [block.model_dump() for block in (body.blocks or [])]
    conv_uid = (body.conv_uid or "").strip()
    docling_artifact_size_bytes = body.docling_artifact_size_bytes
    artifact_bytes_by_type = artifact_bytes_by_type or {}

    if not conv_uid or docling_artifact_size_bytes is None or len(callback_blocks) == 0:
        docling_json_bytes = artifact_bytes_by_type.get("doclingdocument_json") or _download_storage_bytes(
            sb,
            DOCUMENTS_BUCKET,
            docling_key,
        )
        prefix = b"docling\ndoclingdocument_json\n"
        conv_uid = _sha256_hex(prefix + docling_json_bytes)
        docling_artifact_size_bytes = len(docling_json_bytes)
        try:
            parsed_json = json.loads(docling_json_bytes.decode("utf-8"))
        except Exception as exc:  # pragma: no cover - defensive only
            raise FinalizeCallbackError(f"Invalid docling JSON artifact: {exc}", 500) from exc

        callback_blocks = []
        for idx, text in enumerate(parsed_json.get("texts", []) or []):
            block_text = str(text.get("text") or text.get("orig") or "").strip()
            if not block_text:
                continue
            label = str(text.get("label") or "paragraph")
            callback_blocks.append(
                {
                    "block_type": label,
                    "block_content": block_text,
                    "pointer": f"#/texts/{idx}",
                    "parser_block_type": label,
                    "parser_path": f"#/texts/{idx}",
                    "page_no": None,
                    "page_nos": [],
                }
            )

    source_type = str(doc_row["source_type"])
    total_blocks = len(callback_blocks)
    total_characters = sum(len(str(block.get("block_content", ""))) for block in callback_blocks)
    block_type_freq: dict[str, int] = {}
    for block in callback_blocks:
        block_type = str(block.get("block_type", "other"))
        block_type_freq[block_type] = block_type_freq.get(block_type, 0) + 1

    requested_pipeline_config, applied_pipeline_config, parser_runtime_meta = _resolve_applied_config(
        body.pipeline_config,
        body.pipeline_config,
        body.parser_runtime_meta,
    )

    try:
        clear_conversion_state_for_source(source_uid, parsing_tool="docling")
        upsert_blocks(conv_uid, callback_blocks)
        insert_representation_record(
            source_uid=source_uid,
            conv_uid=conv_uid,
            parsing_tool="docling",
            representation_type="doclingdocument_json",
            artifact_locator=docling_key,
            artifact_hash=conv_uid,
            artifact_size_bytes=docling_artifact_size_bytes,
            artifact_meta={"source_type": source_type},
        )
        _insert_supplemental_representation(
            source_uid=source_uid,
            conv_uid=conv_uid,
            source_type=source_type,
            key=md_key,
            representation_type="markdown_bytes",
            sb=sb,
            artifact_bytes=artifact_bytes_by_type.get("markdown_bytes"),
        )
        representation_types = ["doclingdocument_json", "markdown_bytes"]

        if html_key:
            _insert_supplemental_representation(
                source_uid=source_uid,
                conv_uid=conv_uid,
                source_type=source_type,
                key=html_key,
                representation_type="html_bytes",
                sb=sb,
                artifact_bytes=artifact_bytes_by_type.get("html_bytes"),
            )
            representation_types.append("html_bytes")

        if doctags_key:
            _insert_supplemental_representation(
                source_uid=source_uid,
                conv_uid=conv_uid,
                source_type=source_type,
                key=doctags_key,
                representation_type="doctags_text",
                sb=sb,
                artifact_bytes=artifact_bytes_by_type.get("doctags_text"),
            )
            representation_types.append("doctags_text")

        upsert_conversion_parsing(
            source_uid=source_uid,
            conv_parsing_tool="docling",
            pipeline_config=requested_pipeline_config,
            requested_pipeline_config=requested_pipeline_config,
            applied_pipeline_config=applied_pipeline_config,
            parser_runtime_meta=parser_runtime_meta,
            conv_uid=conv_uid,
            conv_locator=docling_key,
            conv_total_blocks=total_blocks,
            conv_total_characters=total_characters,
            conv_representation_type="doclingdocument_json",
            conv_block_type_freq=block_type_freq,
        )
        mark_source_status(source_uid, "parsed", clear_error=True)
        return {
            "ok": True,
            "status": "parsed",
            "conv_uid": conv_uid,
            "blocks_count": total_blocks,
            "track": "docling",
            "representation_types": representation_types,
        }
    except Exception as exc:
        message = str(exc)[:1000]
        clear_conversion_state_for_source(source_uid, parsing_tool="docling")
        mark_source_status(source_uid, "parse_failed", error=message)
        return {
            "ok": False,
            "status": "parse_failed",
            "error": message,
            "conv_uid": conv_uid,
        }

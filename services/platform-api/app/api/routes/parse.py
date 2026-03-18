"""POST /parse — orchestration route for all parsers.

Accepts a simple { source_uid, profile_id? } payload.
Looks up the document, resolves the parser track, dispatches to the
appropriate parser, uploads artifacts, and writes DB rows.

The frontend never needs to construct download URLs, resolve source types,
or build complex payloads. That's all handled here.
"""

import os
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.code_parsing.language_registry import is_code_extension
from app.domain.code_parsing.tree_sitter_service import parse_source
from app.domain.conversion.repository import (
    insert_representation,
    mark_source_status,
    upsert_conversion_parsing,
)
from app.infra.supabase_client import get_supabase_admin
from app.infra.storage import download_from_storage, upsert_to_storage

router = APIRouter(tags=["parse"])

DOCUMENTS_BUCKET = os.environ.get("DOCUMENTS_BUCKET", "documents")


class ParseRequest(BaseModel):
    source_uid: str
    profile_id: Optional[str] = None
    pipeline_config: Optional[dict[str, Any]] = None


def _resolve_profile(sb, profile_id: Optional[str]) -> Optional[dict]:
    """Look up a parsing profile by ID. Returns None if not found or not provided."""
    if not profile_id:
        return None
    result = sb.table("parsing_profiles").select(
        "id, parser, config"
    ).eq("id", profile_id).maybe_single().execute()
    return result.data


@router.post("/parse")
async def parse_route(
    body: ParseRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    sb = get_supabase_admin()
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # 1. Look up the document
    doc = sb.table("source_documents").select(
        "source_uid, source_type, source_locator"
    ).eq("source_uid", body.source_uid).maybe_single().execute()

    if not doc.data:
        return JSONResponse(status_code=404, content={"detail": "Document not found"})

    source_type = doc.data["source_type"]
    source_locator = doc.data["source_locator"]

    # 2. Resolve profile and track
    profile = _resolve_profile(sb, body.profile_id)
    profile_config = (profile.get("config") or {}) if profile else {}
    profile_artifacts: list[str] = profile_config.get("artifacts", ["ast_json", "symbols_json"])

    if is_code_extension(source_type):
        track = "tree_sitter"
    else:
        return JSONResponse(
            status_code=400,
            content={"detail": f"No parser available for source_type '{source_type}' through /parse. Use trigger-parse for Docling formats."},
        )

    # 3. Generate a job ID (matches Docling pattern where trigger-parse creates one)
    conversion_job_id = str(uuid.uuid4())

    # 4. Tree-sitter path
    try:
        mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

        # Download source from storage (service_role — no signed URL needed)
        source_bytes = await download_from_storage(
            supabase_url, supabase_key, DOCUMENTS_BUCKET, source_locator,
        )
        result = parse_source(source_bytes, source_type)

        # Upload AST artifact (if profile includes it)
        if "ast_json" in profile_artifacts:
            ast_locator = f"converted/{body.source_uid}/{body.source_uid}.ast.json"
            await upsert_to_storage(
                supabase_url, supabase_key, DOCUMENTS_BUCKET,
                ast_locator, result.ast_json, "application/json; charset=utf-8",
            )
            insert_representation(
                source_uid=body.source_uid,
                parsing_tool="tree_sitter",
                representation_type="tree_sitter_ast_json",
                artifact_locator=ast_locator,
                artifact_bytes=result.ast_json,
                artifact_meta={"language": result.language, "node_count": result.node_count},
            )

        # Upload symbols artifact (if profile includes it)
        if "symbols_json" in profile_artifacts:
            symbols_locator = f"converted/{body.source_uid}/{body.source_uid}.symbols.json"
            await upsert_to_storage(
                supabase_url, supabase_key, DOCUMENTS_BUCKET,
                symbols_locator, result.symbols_json, "application/json; charset=utf-8",
            )
            insert_representation(
                source_uid=body.source_uid,
                parsing_tool="tree_sitter",
                representation_type="tree_sitter_symbols_json",
                artifact_locator=symbols_locator,
                artifact_bytes=result.symbols_json,
                artifact_meta={"language": result.language},
            )

        # Persist parsing record + mark complete
        upsert_conversion_parsing(
            source_uid=body.source_uid,
            conv_parsing_tool="tree_sitter",
            pipeline_config=body.pipeline_config or profile_config,
            parser_runtime_meta={
                "language": result.language,
                "node_count": result.node_count,
                "source_type": result.source_type,
            },
        )
        mark_source_status(body.source_uid, "parsed")

    except Exception as e:
        mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
        return JSONResponse(status_code=500, content={"detail": str(e)[:500]})

    return {"ok": True, "track": track}

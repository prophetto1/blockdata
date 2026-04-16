"""POST /parse — orchestration route for all parsers.

Accepts a simple { source_uid, profile_id? } payload.
Looks up the document, resolves the parser track, dispatches to the
appropriate parser, uploads artifacts, and writes DB rows.

The frontend never needs to construct download URLs, resolve source types,
or build complex payloads. That's all handled here.
"""

import os
import hashlib
import uuid
from pathlib import PurePosixPath
from typing import Any, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.api.routes.conversion import build_docling_conv_uid, ensure_conversion_capacity
from app.domain.code_parsing.language_registry import is_code_extension
from app.domain.code_parsing.tree_sitter_service import parse_source
from app.domain.markdown_parsing.service import parse_markdown_source
from app.domain.pandoc_parsing.service import PandocUnavailableError, parse_pandoc_source
from app.domain.conversion.finalize import finalize_docling_callback
from app.domain.conversion.models import (
    ConversionCallbackRequest,
    ConvertRequest,
    OutputTarget,
    is_docling_source_type,
    is_markdown_source_type,
    is_pandoc_source_type,
)
from app.domain.conversion.repository import (
    clear_conversion_state_for_source,
    insert_representation,
    mark_source_status,
    upsert_conversion_parsing,
)
from app.domain.conversion.service import convert as convert_docling
from app.infra.supabase_client import get_supabase_admin
from app.infra.storage import download_from_storage, upsert_to_storage
from app.workers.conversion_pool import PoolOverloaded, get_conversion_pool

from opentelemetry import trace

tracer = trace.get_tracer(__name__)

router = APIRouter(tags=["parse"])

DOCUMENTS_BUCKET = os.environ.get("DOCUMENTS_BUCKET", "documents")


class ParseRequest(BaseModel):
    source_uid: str
    profile_id: Optional[str] = None
    pipeline_config: Optional[dict[str, Any]] = None


def _build_parse_run_conv_uid(parsing_tool: str, source_uid: str, conversion_job_id: str) -> str:
    digest = hashlib.sha256()
    digest.update(f"{parsing_tool}\n{source_uid}\n{conversion_job_id}".encode())
    return digest.hexdigest()


def _basename_no_ext(path: str) -> str:
    name = PurePosixPath(path).name or "file"
    return name.rsplit(".", 1)[0] if "." in name else name


def _extract_signed_url(payload: Any) -> str:
    if isinstance(payload, dict):
        return (
            payload.get("signedURL")
            or payload.get("signedUrl")
            or payload.get("signed_url")
            or ""
        )
    return ""


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
    with tracer.start_as_current_span("parse.request") as span:
        sb = get_supabase_admin()
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        response_conv_uid: str | None = None
        response_representation_types: list[str] = []

        # 1. Look up the document
        doc = sb.table("source_documents").select(
            "source_uid, owner_id, source_type, source_locator, status"
        ).eq("source_uid", body.source_uid).maybe_single().execute()

        if not doc.data:
            return JSONResponse(status_code=404, content={"detail": "Document not found"})

        if doc.data.get("owner_id") != auth.subject_id:
            return JSONResponse(status_code=403, content={"detail": "Document not owned by you"})

        parseable_statuses = {"uploaded", "conversion_failed", "parse_failed"}
        if doc.data.get("status") not in parseable_statuses:
            return JSONResponse(
                status_code=409,
                content={"detail": f"Cannot parse document in status: {doc.data.get('status')}"},
            )

        source_type = doc.data["source_type"]
        source_locator = doc.data["source_locator"]
        span.set_attribute("source_type", source_type)

        # 2. Resolve profile and track
        profile = _resolve_profile(sb, body.profile_id)
        profile_config = (profile.get("config") or {}) if profile else {}
        profile_artifacts: list[str] = profile_config.get("artifacts", ["ast_json", "symbols_json"])

        if is_code_extension(source_type):
            track = "tree_sitter"
        elif is_markdown_source_type(source_type):
            track = "mdast"
        elif is_pandoc_source_type(source_type):
            track = "pandoc"
        elif is_docling_source_type(source_type):
            track = "docling"
        else:
            return JSONResponse(
                status_code=400,
                content={"detail": f"No parser available for source_type '{source_type}' through /parse."},
            )

        span.set_attribute("track", track)

        # 3. Generate a job ID for this parse run
        conversion_job_id = str(uuid.uuid4())
        parse_conv_uid = _build_parse_run_conv_uid(track, body.source_uid, conversion_job_id)

        if track == "tree_sitter":
            try:
                clear_conversion_state_for_source(body.source_uid, parsing_tool="tree_sitter")
                mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

                # Download source from storage (service_role — no signed URL needed)
                source_bytes = await download_from_storage(
                    supabase_url, supabase_key, DOCUMENTS_BUCKET, source_locator,
                )
                result = parse_source(source_bytes, source_type)

                # Pre-compute artifact locators so they're available for the parsing record.
                ast_locator = f"converted/{body.source_uid}/{body.source_uid}.ast.json" if "ast_json" in profile_artifacts else None
                symbols_locator = f"converted/{body.source_uid}/{body.source_uid}.symbols.json" if "symbols_json" in profile_artifacts else None

                # Upload AST artifact (if profile includes it)
                if ast_locator:
                    await upsert_to_storage(
                        supabase_url, supabase_key, DOCUMENTS_BUCKET,
                        ast_locator, result.ast_json, "application/json; charset=utf-8",
                    )
                    insert_representation(
                        source_uid=body.source_uid,
                        conv_uid=parse_conv_uid,
                        parsing_tool="tree_sitter",
                        representation_type="tree_sitter_ast_json",
                        artifact_locator=ast_locator,
                        artifact_bytes=result.ast_json,
                        artifact_meta={"language": result.language, "node_count": result.node_count},
                    )

                # Upload symbols artifact (if profile includes it)
                if symbols_locator:
                    await upsert_to_storage(
                        supabase_url, supabase_key, DOCUMENTS_BUCKET,
                        symbols_locator, result.symbols_json, "application/json; charset=utf-8",
                    )
                    insert_representation(
                        source_uid=body.source_uid,
                        conv_uid=parse_conv_uid,
                        parsing_tool="tree_sitter",
                        representation_type="tree_sitter_symbols_json",
                        artifact_locator=symbols_locator,
                        artifact_bytes=result.symbols_json,
                        artifact_meta={"language": result.language},
                    )

                # Persist parsing record + mark complete.
                # Use the primary artifact locator as conv_locator for view_documents.
                primary_locator = ast_locator or symbols_locator
                upsert_conversion_parsing(
                    source_uid=body.source_uid,
                    conv_parsing_tool="tree_sitter",
                    pipeline_config=body.pipeline_config or profile_config,
                    parser_runtime_meta={
                        "language": result.language,
                        "node_count": result.node_count,
                        "source_type": result.source_type,
                    },
                    conv_uid=parse_conv_uid,
                    conv_locator=primary_locator,
                )
                mark_source_status(body.source_uid, "parsed", clear_error=True)
                response_conv_uid = parse_conv_uid
                if ast_locator:
                    response_representation_types.append("tree_sitter_ast_json")
                if symbols_locator:
                    response_representation_types.append("tree_sitter_symbols_json")

            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                clear_conversion_state_for_source(body.source_uid, parsing_tool="tree_sitter")
                mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
                return JSONResponse(status_code=500, content={"detail": str(e)[:500]})
        elif track == "mdast":
            base_name = _basename_no_ext(source_locator)
            mdast_key = f"converted/{body.source_uid}/{base_name}.mdast.json"
            markdown_key = f"converted/{body.source_uid}/{base_name}.md"

            try:
                clear_conversion_state_for_source(body.source_uid, parsing_tool="mdast")
                mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

                source_bytes = await download_from_storage(
                    supabase_url, supabase_key, DOCUMENTS_BUCKET, source_locator,
                )
                result = await parse_markdown_source(source_bytes, source_type)

                await upsert_to_storage(
                    supabase_url,
                    supabase_key,
                    DOCUMENTS_BUCKET,
                    mdast_key,
                    result.mdast_json,
                    "application/json; charset=utf-8",
                )
                insert_representation(
                    source_uid=body.source_uid,
                    conv_uid=parse_conv_uid,
                    parsing_tool="mdast",
                    representation_type="mdast_json",
                    artifact_locator=mdast_key,
                    artifact_bytes=result.mdast_json,
                    artifact_meta={"source_type": source_type, "track": "mdast"},
                )

                await upsert_to_storage(
                    supabase_url,
                    supabase_key,
                    DOCUMENTS_BUCKET,
                    markdown_key,
                    result.markdown_bytes,
                    "text/markdown; charset=utf-8",
                )
                insert_representation(
                    source_uid=body.source_uid,
                    conv_uid=parse_conv_uid,
                    parsing_tool="mdast",
                    representation_type="markdown_bytes",
                    artifact_locator=markdown_key,
                    artifact_bytes=result.markdown_bytes,
                    artifact_meta={"source_type": source_type, "track": "mdast", "role": "supplemental"},
                )

                upsert_conversion_parsing(
                    source_uid=body.source_uid,
                    conv_parsing_tool="mdast",
                    pipeline_config=body.pipeline_config or profile_config,
                    parser_runtime_meta={
                        "source_type": result.source_type,
                        "track": "mdast",
                    },
                    conv_uid=parse_conv_uid,
                    conv_locator=mdast_key,
                    conv_representation_type="mdast_json",
                )
                mark_source_status(body.source_uid, "parsed", clear_error=True)
                response_conv_uid = parse_conv_uid
                response_representation_types = ["mdast_json", "markdown_bytes"]
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                clear_conversion_state_for_source(body.source_uid, parsing_tool="mdast")
                mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
                return JSONResponse(status_code=500, content={"detail": str(e)[:500]})
        elif track == "pandoc":
            base_name = _basename_no_ext(source_locator)
            pandoc_key = f"converted/{body.source_uid}/{base_name}.pandoc.json"

            try:
                clear_conversion_state_for_source(body.source_uid, parsing_tool="pandoc")
                mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

                source_bytes = await download_from_storage(
                    supabase_url, supabase_key, DOCUMENTS_BUCKET, source_locator,
                )
                result = await parse_pandoc_source(source_bytes, source_type)

                await upsert_to_storage(
                    supabase_url,
                    supabase_key,
                    DOCUMENTS_BUCKET,
                    pandoc_key,
                    result.pandoc_ast_json,
                    "application/json; charset=utf-8",
                )
                insert_representation(
                    source_uid=body.source_uid,
                    conv_uid=parse_conv_uid,
                    parsing_tool="pandoc",
                    representation_type="pandoc_ast_json",
                    artifact_locator=pandoc_key,
                    artifact_bytes=result.pandoc_ast_json,
                    artifact_meta={
                        "source_type": result.source_type,
                        "track": "pandoc",
                        "input_format": result.input_format,
                    },
                )

                upsert_conversion_parsing(
                    source_uid=body.source_uid,
                    conv_parsing_tool="pandoc",
                    pipeline_config=body.pipeline_config or profile_config,
                    parser_runtime_meta={
                        "source_type": result.source_type,
                        "track": "pandoc",
                        "input_format": result.input_format,
                    },
                    conv_uid=parse_conv_uid,
                    conv_locator=pandoc_key,
                    conv_representation_type="pandoc_ast_json",
                )
                mark_source_status(body.source_uid, "parsed", clear_error=True)
                response_conv_uid = parse_conv_uid
                response_representation_types = ["pandoc_ast_json"]
            except PandocUnavailableError as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                clear_conversion_state_for_source(body.source_uid, parsing_tool="pandoc")
                mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
                return JSONResponse(status_code=503, content={"detail": str(e)[:500]})
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                clear_conversion_state_for_source(body.source_uid, parsing_tool="pandoc")
                mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
                return JSONResponse(status_code=500, content={"detail": str(e)[:500]})
        else:
            try:
                ensure_conversion_capacity(get_conversion_pool())
            except PoolOverloaded:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Conversion pool at capacity. Try again shortly."},
                    headers={"Retry-After": "15"},
                )

            effective_pipeline_config = body.pipeline_config or profile_config
            base_name = _basename_no_ext(source_locator)
            md_key = f"converted/{body.source_uid}/{base_name}.md"
            docling_key = f"converted/{body.source_uid}/{base_name}.docling.json"
            html_key = f"converted/{body.source_uid}/{base_name}.html"
            doctags_key = f"converted/{body.source_uid}/{base_name}.doctags"

            try:
                clear_conversion_state_for_source(body.source_uid, parsing_tool="docling")
                mark_source_status(body.source_uid, "converting", conversion_job_id=conversion_job_id)

                bucket_proxy = sb.storage.from_(DOCUMENTS_BUCKET)
                signed_download = bucket_proxy.create_signed_url(source_locator, 600)
                source_download_url = _extract_signed_url(signed_download)
                if not source_download_url:
                    raise RuntimeError("Failed to create a signed source download URL")

                convert_request = ConvertRequest(
                    source_uid=body.source_uid,
                    conversion_job_id=conversion_job_id,
                    track="docling",
                    source_type=source_type,
                    source_download_url=source_download_url,
                    output=OutputTarget(
                        bucket=DOCUMENTS_BUCKET,
                        key=md_key,
                        signed_upload_url="internal://markdown",
                    ),
                    docling_output=OutputTarget(
                        bucket=DOCUMENTS_BUCKET,
                        key=docling_key,
                        signed_upload_url="internal://docling",
                    ),
                    html_output=OutputTarget(
                        bucket=DOCUMENTS_BUCKET,
                        key=html_key,
                        signed_upload_url="internal://html",
                    ),
                    doctags_output=OutputTarget(
                        bucket=DOCUMENTS_BUCKET,
                        key=doctags_key,
                        signed_upload_url="internal://doctags",
                    ),
                    pipeline_config=effective_pipeline_config,
                )
                markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = await convert_docling(
                    convert_request
                )

                await upsert_to_storage(
                    supabase_url,
                    supabase_key,
                    DOCUMENTS_BUCKET,
                    md_key,
                    markdown_bytes,
                    "text/markdown; charset=utf-8",
                )

                if not docling_json_bytes:
                    raise RuntimeError("Docling conversion did not return a docling JSON artifact")

                conv_uid = build_docling_conv_uid(docling_json_bytes)

                await upsert_to_storage(
                    supabase_url,
                    supabase_key,
                    DOCUMENTS_BUCKET,
                    docling_key,
                    docling_json_bytes,
                    "application/json; charset=utf-8",
                )

                if html_bytes is not None:
                    await upsert_to_storage(
                        supabase_url,
                        supabase_key,
                        DOCUMENTS_BUCKET,
                        html_key,
                        html_bytes,
                        "text/html",
                    )

                if doctags_bytes is not None:
                    await upsert_to_storage(
                        supabase_url,
                        supabase_key,
                        DOCUMENTS_BUCKET,
                        doctags_key,
                        doctags_bytes,
                        "text/plain; charset=utf-8",
                    )

                callback_result = await finalize_docling_callback(
                    ConversionCallbackRequest(
                        source_uid=body.source_uid,
                        conversion_job_id=conversion_job_id,
                        track="docling",
                        md_key=md_key,
                        docling_key=docling_key,
                        html_key=html_key if html_bytes is not None else None,
                        doctags_key=doctags_key if doctags_bytes is not None else None,
                        pipeline_config=effective_pipeline_config,
                        parser_runtime_meta={
                            "source_type": source_type,
                            "track": "docling",
                        },
                        blocks=blocks,
                        conv_uid=conv_uid,
                        docling_artifact_size_bytes=len(docling_json_bytes),
                        success=True,
                    ),
                    sb=sb,
                    artifact_bytes_by_type={
                        "doclingdocument_json": docling_json_bytes,
                        "markdown_bytes": markdown_bytes,
                        **({"html_bytes": html_bytes} if html_bytes is not None else {}),
                        **({"doctags_text": doctags_bytes} if doctags_bytes is not None else {}),
                    },
                    enforce_conversion_job_match=False,
                )
                if not callback_result.get("ok"):
                    return JSONResponse(
                        status_code=500,
                        content={"detail": str(callback_result.get("error") or "Docling finalization failed")[:500]},
                    )
                response_conv_uid = str(callback_result["conv_uid"])
                response_representation_types = list(callback_result.get("representation_types", []))
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                clear_conversion_state_for_source(body.source_uid, parsing_tool="docling")
                mark_source_status(body.source_uid, "conversion_failed", error=str(e)[:1000])
                return JSONResponse(
                    status_code=500,
                    content={"detail": str(e)[:500]},
                )

        return {
            "ok": True,
            "track": track,
            "conv_uid": response_conv_uid,
            "representation_types": response_representation_types,
        }

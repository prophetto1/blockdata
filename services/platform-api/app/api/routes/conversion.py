import asyncio
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse

from app.auth.dependencies import require_auth
from app.auth.principals import AuthPrincipal
from app.domain.conversion.models import ConvertRequest, CitationsRequest
from app.domain.conversion.service import convert
from app.domain.conversion.callbacks import send_conversion_callback
from app.infra.http_client import upload_bytes, append_token_if_needed
from app.workers.conversion_pool import get_conversion_pool, PoolOverloaded

from eyecite import get_citations, resolve_citations

router = APIRouter(tags=["conversion"])


def _serialize_citation(c: Any) -> dict[str, Any]:
    meta = c.metadata
    meta_dict: dict[str, Any] = {}
    for field in meta.__dataclass_fields__:
        val = getattr(meta, field, None)
        if val is not None:
            meta_dict[field] = val
    return {
        "type": type(c).__name__,
        "matched_text": c.matched_text(),
        "span": list(c.span()),
        "groups": dict(c.groups),
        "metadata": meta_dict,
    }


def _run_convert_in_process(req_dict: dict) -> tuple:
    """Top-level function for ProcessPoolExecutor (must be picklable).

    Reconstructs the ConvertRequest from dict, runs the sync-heavy conversion,
    and returns the result tuple.
    """
    import asyncio
    from app.domain.conversion.models import ConvertRequest
    from app.domain.conversion.service import convert

    req = ConvertRequest(**req_dict)
    return asyncio.run(convert(req))


@router.post("/convert")
async def convert_route(
    body: ConvertRequest,
    auth: AuthPrincipal = Depends(require_auth),
):
    shared_secret = os.environ.get("CONVERSION_SERVICE_KEY", "")
    track = "docling"

    # Admission control: check capacity BEFORE entering the try/finally callback block.
    # If we reject here, no callback fires — the job was never accepted.
    pool = get_conversion_pool()
    use_pool = pool._max_workers > 0
    if use_pool:
        pool_status = pool.status()
        capacity = pool_status["max_workers"] + pool_status["max_queue_depth"]
        if pool_status["active"] >= capacity:
            return JSONResponse(
                status_code=503,
                content={"detail": "Conversion pool at capacity. Try again shortly."},
                headers={"Retry-After": "15"},
            )

    callback_payload: dict[str, Any] = {
        "source_uid": body.source_uid,
        "conversion_job_id": body.conversion_job_id,
        "track": track,
        "md_key": body.output.key,
        "docling_key": None,
        "html_key": None,
        "doctags_key": None,
        "success": False,
        "error": None,
    }

    try:
        # Docling conversion is CPU-bound — offload to process pool.
        if use_pool:
            markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = (
                await pool.submit(_run_convert_in_process, body.model_dump())
            )
        else:
            markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = await convert(body)

        md_url = append_token_if_needed(body.output.signed_upload_url, body.output.token)
        await upload_bytes(md_url, markdown_bytes, "text/markdown; charset=utf-8")

        if body.docling_output and docling_json_bytes:
            url = append_token_if_needed(body.docling_output.signed_upload_url, body.docling_output.token)
            await upload_bytes(url, docling_json_bytes, "application/json; charset=utf-8")
            callback_payload["docling_key"] = body.docling_output.key

        if body.html_output and html_bytes:
            url = append_token_if_needed(body.html_output.signed_upload_url, body.html_output.token)
            await upload_bytes(url, html_bytes, "text/html")
            callback_payload["html_key"] = body.html_output.key

        if body.doctags_output and doctags_bytes:
            url = append_token_if_needed(body.doctags_output.signed_upload_url, body.doctags_output.token)
            await upload_bytes(url, doctags_bytes, "text/plain; charset=utf-8")
            callback_payload["doctags_key"] = body.doctags_output.key

        callback_payload["success"] = True
    except Exception as e:
        callback_payload["success"] = False
        callback_payload["error"] = str(e)[:1000]
    finally:
        await send_conversion_callback(body.callback_url, shared_secret, callback_payload)

    return {"ok": True}


@router.post("/citations")
async def citations_route(
    body: CitationsRequest,
    auth: AuthPrincipal = Depends(require_auth),
):
    cites = get_citations(body.text, remove_ambiguous=False)
    resolutions = resolve_citations(cites)

    results = []
    cite_to_resource: dict[int, int] = {}
    resources = []
    for i, (resource, members) in enumerate(resolutions.items()):
        resources.append({
            "id": i,
            "anchor": _serialize_citation(resource.citation),
            "count": len(members),
        })
        for m in members:
            cite_to_resource[id(m)] = i

    for c in cites:
        entry = _serialize_citation(c)
        entry["resource_id"] = cite_to_resource.get(id(c))
        results.append(entry)

    return {"citations": results, "resources": resources, "total": len(results)}

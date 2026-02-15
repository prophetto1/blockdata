from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from pathlib import Path
import uuid
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from .partition import build_partition_elements
from .partition_adapter import partition_document_bytes
from .taxonomy import TAXONOMY_MAPPING_VERSION

app = FastAPI()


class PartitionParameters(BaseModel):
    coordinates: bool = False
    strategy: Literal["fast", "hi_res", "auto", "ocr_only"] = "auto"
    output_format: Literal["application/json", "text/csv"] = "application/json"
    unique_element_ids: bool = False
    chunking_strategy: Literal["basic", "by_title"] | None = None


class GeneralFormParams(PartitionParameters):
    @classmethod
    def as_form(
        cls,
        coordinates: bool = Form(default=False),
        strategy: Literal["fast", "hi_res", "auto", "ocr_only"] = Form(default="auto"),
        output_format: Literal["application/json", "text/csv"] = Form(
            default="application/json"
        ),
        unique_element_ids: bool = Form(default=False),
        chunking_strategy: Literal["basic", "by_title"] | None = Form(default=None),
    ) -> "GeneralFormParams":
        return cls(
            coordinates=coordinates,
            strategy=strategy,
            output_format=output_format,
            unique_element_ids=unique_element_ids,
            chunking_strategy=chunking_strategy,
        )


class PartitionRequest(BaseModel):
    source_uid: str
    source_type: str
    source_locator: str | None = None
    doc_title: str | None = None
    partition_parameters: PartitionParameters = Field(
        default_factory=PartitionParameters
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "unstructured-track-service",
        "taxonomy_mapping_version": TAXONOMY_MAPPING_VERSION,
    }


def _infer_source_type(upload: UploadFile) -> str:
    if upload.filename:
        suffix = Path(upload.filename).suffix.lower().lstrip(".")
        if suffix:
            return suffix
    if upload.content_type and "/" in upload.content_type:
        return upload.content_type.split("/", 1)[1].lower()
    return "bin"


def _to_csv(elements: list[dict[str, object]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["type", "element_id", "text"])
    for element in elements:
        writer.writerow(
            [
                element.get("type") or "",
                element.get("element_id") or "",
                element.get("text") or "",
            ]
        )
    return buffer.getvalue()


def _to_multipart_mixed(parts: list[list[dict[str, object]]]) -> Response:
    boundary = f"track-b-{uuid.uuid4().hex}"
    chunks: list[str] = []
    for part in parts:
        chunks.append(f"--{boundary}\r\n")
        chunks.append("Content-Type: application/json\r\n\r\n")
        chunks.append(json.dumps(part))
        chunks.append("\r\n")
    chunks.append(f"--{boundary}--\r\n")
    body = "".join(chunks)
    return Response(
        content=body,
        media_type=f"multipart/mixed; boundary={boundary}",
    )


@app.post("/general/v0/general")
@app.post("/general/v1/general", include_in_schema=False)
async def general_partition(
    request: Request,
    files: list[UploadFile] = File(...),
    form_params: GeneralFormParams = Depends(GeneralFormParams.as_form),
) -> object:
    if api_key_env := os.environ.get("UNSTRUCTURED_API_KEY"):
        api_key = request.headers.get("unstructured-api-key")
        if api_key != api_key_env:
            raise HTTPException(status_code=401, detail=f"API key {api_key} is invalid")

    accept_type = request.headers.get("Accept")
    if (
        len(files) > 1
        and accept_type
        and accept_type
        not in ["*/*", "multipart/mixed", "application/json", "text/csv"]
    ):
        raise HTTPException(
            status_code=406,
            detail=f"Conflict in media type {accept_type} with response type 'multipart/mixed'.",
        )

    all_elements: list[list[dict[str, object]]] = []
    backends_used: list[str] = []
    for file in files:
        content = await file.read()
        source_uid = hashlib.sha256(
            content if content else (file.filename or "unnamed").encode("utf-8")
        ).hexdigest()
        elements, backend = partition_document_bytes(
            filename=file.filename or "unnamed",
            content=content,
            source_uid=source_uid,
            source_type=_infer_source_type(file),
            source_locator=file.filename,
            doc_title=Path(file.filename).stem if file.filename else None,
            partition_parameters=form_params.model_dump(),
        )
        all_elements.append(elements)  # type: ignore[arg-type]
        backends_used.append(backend)

    if form_params.output_format == "text/csv":
        flattened = [element for group in all_elements for element in group]
        response = PlainTextResponse(_to_csv(flattened), media_type="text/csv")
        response.headers["X-Track-B-Partition-Backend"] = ",".join(backends_used)
        return response

    if accept_type == "multipart/mixed":
        response = _to_multipart_mixed(all_elements)
        response.headers["X-Track-B-Partition-Backend"] = ",".join(backends_used)
        return response

    if len(all_elements) == 1:
        return JSONResponse(
            all_elements[0],
            headers={"X-Track-B-Partition-Backend": ",".join(backends_used)},
        )
    return JSONResponse(
        all_elements,
        headers={"X-Track-B-Partition-Backend": ",".join(backends_used)},
    )


@app.get("/general/v0/general", include_in_schema=False)
@app.get("/general/v1/general", include_in_schema=False)
async def handle_invalid_get_request() -> None:
    raise HTTPException(
        status_code=405,
        detail="Only POST requests are supported.",
    )


@app.post("/partition")
def partition(
    req: PartitionRequest,
    x_track_b_service_key: str | None = Header(default=None),
) -> dict[str, object]:
    expected_key = (os.environ.get("TRACK_B_SERVICE_KEY") or "").strip()
    if expected_key and x_track_b_service_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "elements": build_partition_elements(
            source_uid=req.source_uid,
            source_type=req.source_type,
            doc_title=req.doc_title,
            source_locator=req.source_locator,
            include_coordinates=req.partition_parameters.coordinates,
            unique_element_ids=req.partition_parameters.unique_element_ids,
        ),
        "mapping_version": TAXONOMY_MAPPING_VERSION,
        "partition": req.partition_parameters.model_dump(),
    }

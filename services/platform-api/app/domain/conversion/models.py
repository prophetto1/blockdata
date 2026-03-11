"""Conversion request/response models."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class OutputTarget(BaseModel):
    bucket: str
    key: str
    signed_upload_url: str
    token: Optional[str] = None


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: str


class CitationsRequest(BaseModel):
    text: str


class CitationResult(BaseModel):
    type: str
    matched_text: str
    span: list[int]
    groups: dict[str, Any]
    metadata: dict[str, Any]
    resource_id: Optional[str] = None

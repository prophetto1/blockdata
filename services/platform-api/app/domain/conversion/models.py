"""Conversion request/response models."""

from typing import Any, Optional

from pydantic import BaseModel, Field

DOCLING_SOURCE_TYPES = (
    "docx",
    "pdf",
    "pptx",
    "xlsx",
    "html",
    "csv",
    "txt",
    "odt",
    "epub",
)

DOCLING_SOURCE_TYPE_PATTERN = r"^(" + "|".join(DOCLING_SOURCE_TYPES) + r")$"
MARKDOWN_SOURCE_TYPES = (
    "md",
    "markdown",
)
PANDOC_ALPHA_SOURCE_TYPES = (
    "rst",
    "latex",
    "tex",
    "rtf",
    "org",
    "asciidoc",
)


def is_docling_source_type(source_type: str) -> bool:
    return source_type in DOCLING_SOURCE_TYPES


def is_markdown_source_type(source_type: str) -> bool:
    return source_type in MARKDOWN_SOURCE_TYPES


def is_pandoc_source_type(source_type: str) -> bool:
    return source_type in PANDOC_ALPHA_SOURCE_TYPES


class OutputTarget(BaseModel):
    bucket: str
    key: str
    signed_upload_url: str
    token: Optional[str] = None


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(docling)$")
    source_type: str = Field(pattern=DOCLING_SOURCE_TYPE_PATTERN)
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: Optional[str] = None
    pipeline_config: Optional[dict[str, Any]] = None


class CallbackDoclingBlock(BaseModel):
    block_type: str
    block_content: str
    pointer: str
    parser_block_type: str
    parser_path: str
    page_no: Optional[int] = None
    page_nos: list[int] = Field(default_factory=list)


class ConversionCallbackRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(docling)$")
    md_key: str
    docling_key: Optional[str] = None
    html_key: Optional[str] = None
    doctags_key: Optional[str] = None
    pipeline_config: Optional[dict[str, Any]] = None
    parser_runtime_meta: Optional[dict[str, Any]] = None
    blocks: Optional[list[CallbackDoclingBlock]] = None
    conv_uid: Optional[str] = None
    docling_artifact_size_bytes: Optional[int] = None
    success: bool
    error: Optional[str] = None


class ReconstructRequest(BaseModel):
    docling_json_url: str


class CitationsRequest(BaseModel):
    text: str


class CitationResult(BaseModel):
    type: str
    matched_text: str
    span: list[int]
    groups: dict[str, Any]
    metadata: dict[str, Any]
    resource_id: Optional[str] = None

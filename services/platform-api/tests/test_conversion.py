# services/platform-api/tests/test_conversion.py
import asyncio
import pytest
from app.domain.conversion.models import ConvertRequest, OutputTarget
from app.domain.conversion.service import convert, reconstruct_from_dict


def _build_request(track=None, source_type="txt"):
    output = OutputTarget(
        bucket="documents",
        key="converted/source/file.md",
        signed_upload_url="https://example.test/upload",
        token=None,
    )
    return ConvertRequest(
        source_uid="source-uid",
        conversion_job_id="job-uid",
        track=track,
        source_type=source_type,
        source_download_url="https://example.test/source",
        output=output,
        callback_url="https://example.test/callback",
    )


# ── Model validation tests ──


def test_track_only_accepts_docling():
    req = _build_request(track="docling", source_type="rst")
    assert req.track == "docling"


def test_track_defaults_to_none():
    req = _build_request(track=None, source_type="txt")
    assert req.track is None


def test_track_rejects_pandoc():
    with pytest.raises(Exception):
        _build_request(track="pandoc", source_type="rst")


def test_all_source_types_accepted():
    for st in ["docx", "pdf", "pptx", "xlsx", "html", "csv", "txt", "md", "markdown", "rst", "latex", "odt", "epub", "rtf", "org"]:
        req = _build_request(track="docling", source_type=st)
        assert req.source_type == st


# ── convert() function tests ──


def test_convert_returns_4_tuple_with_all_artifacts(monkeypatch):
    """convert() returns (markdown, docling_json, html, doctags) — 4-tuple, not 5."""
    import app.domain.conversion.service as svc

    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# Hello\n"

        def export_to_dict(self) -> dict:
            return {"a": 1}

        def export_to_html(self) -> str:
            return "<h1>Hello</h1>"

        def export_to_doctags(self) -> str:
            return "<doctag>Hello</doctag>"

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str):
            return FakeResult()

    monkeypatch.setattr(svc, "_build_docling_converter", lambda: FakeConverter())

    req = _build_request(track="docling", source_type="txt")
    req.docling_output = OutputTarget(
        bucket="documents", key="k.docling.json",
        signed_upload_url="https://example.test/u", token=None,
    )
    req.html_output = OutputTarget(
        bucket="documents", key="k.html",
        signed_upload_url="https://example.test/u", token=None,
    )
    req.doctags_output = OutputTarget(
        bucket="documents", key="k.doctags",
        signed_upload_url="https://example.test/u", token=None,
    )

    result = asyncio.run(convert(req))
    assert len(result) == 4, f"Expected 4-tuple, got {len(result)}-tuple"
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = result
    assert markdown_bytes == b"# Hello\n"
    assert docling_json_bytes is not None
    assert html_bytes == b"<h1>Hello</h1>"
    assert doctags_bytes == b"<doctag>Hello</doctag>"


def test_convert_omits_optional_artifacts_when_not_requested(monkeypatch):
    """When docling_output/html_output/doctags_output are None, those return None."""
    import app.domain.conversion.service as svc

    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# Minimal\n"

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str):
            return FakeResult()

    monkeypatch.setattr(svc, "_build_docling_converter", lambda: FakeConverter())

    req = _build_request(track="docling", source_type="md")
    result = asyncio.run(convert(req))
    assert len(result) == 4
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = result
    assert markdown_bytes == b"# Minimal\n"
    assert docling_json_bytes is None
    assert html_bytes is None
    assert doctags_bytes is None


def test_convert_works_for_rst_source_type(monkeypatch):
    """rst (formerly pandoc-only) now goes through Docling."""
    import app.domain.conversion.service as svc

    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# RST doc\n"

        def export_to_dict(self) -> dict:
            return {"rst": True}

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str):
            return FakeResult()

    monkeypatch.setattr(svc, "_build_docling_converter", lambda: FakeConverter())

    req = _build_request(track="docling", source_type="rst")
    req.docling_output = OutputTarget(
        bucket="documents", key="k.docling.json",
        signed_upload_url="https://example.test/u", token=None,
    )
    result = asyncio.run(convert(req))
    assert len(result) == 4
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = result
    assert markdown_bytes == b"# RST doc\n"
    assert docling_json_bytes is not None


# ── reconstruct_from_dict tests ──


def test_reconstruct_from_dict():
    """reconstruct_from_dict returns html string and blocks list."""
    doc_dict = {
        "schema_name": "DoclingDocument",
        "version": "1.3.0",
        "name": "test",
        "origin": {"mimetype": "text/plain", "filename": "test.txt"},
        "furniture": {"self_ref": "#/furniture", "children": [], "content_layer": "furniture", "name": "_root_", "label": "unspecified"},
        "body": {
            "self_ref": "#/body",
            "children": [{"$ref": "#/texts/0"}],
            "content_layer": "body",
            "name": "_root_",
            "label": "unspecified",
        },
        "groups": [],
        "texts": [
            {
                "self_ref": "#/texts/0",
                "parent": {"$ref": "#/body"},
                "children": [],
                "content_layer": "body",
                "label": "paragraph",
                "prov": [],
                "orig": "Hello world",
                "text": "Hello world",
            }
        ],
        "pictures": [],
        "tables": [],
        "key_value_items": [],
        "form_items": [],
        "pages": {},
    }

    html, blocks = reconstruct_from_dict(doc_dict)
    assert isinstance(html, str)
    assert "Hello world" in html
    assert len(blocks) >= 1
    assert blocks[0]["block_content"] == "Hello world"
    assert blocks[0]["block_type"] == "paragraph"

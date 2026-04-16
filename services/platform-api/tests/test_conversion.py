# services/platform-api/tests/test_conversion.py
import asyncio
import pytest
from unittest.mock import MagicMock, patch
from app.domain.conversion.models import ConvertRequest, OutputTarget
from app.domain.conversion.finalize import finalize_docling_callback
from app.domain.conversion.models import ConversionCallbackRequest
from app.domain.conversion.service import convert, reconstruct_from_dict


def _build_request(track=None, source_type="txt", callback_url="https://example.test/callback"):
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
        callback_url=callback_url,
    )


# ── Model validation tests ──


def test_track_only_accepts_docling():
    req = _build_request(track="docling", source_type="txt")
    assert req.track == "docling"


def test_track_defaults_to_none():
    req = _build_request(track=None, source_type="txt")
    assert req.track is None


def test_callback_url_defaults_to_none_for_internal_callers():
    req = _build_request(track="docling", source_type="txt", callback_url=None)
    assert req.callback_url is None


def test_track_rejects_pandoc():
    with pytest.raises(Exception):
        _build_request(track="pandoc", source_type="rst")


def test_all_source_types_accepted():
    for st in ["docx", "pdf", "pptx", "xlsx", "html", "csv", "txt", "odt", "epub"]:
        req = _build_request(track="docling", source_type=st)
        assert req.source_type == st


# ── convert() function tests ──


def test_convert_returns_5_tuple_with_all_artifacts(monkeypatch):
    """convert() returns (markdown, docling_json, html, doctags, blocks) — 5-tuple."""
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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda _cfg=None: FakeConverter())

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
    assert len(result) == 5, f"Expected 5-tuple, got {len(result)}-tuple"
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# Hello\n"
    assert docling_json_bytes is not None
    assert html_bytes == b"<h1>Hello</h1>"
    assert doctags_bytes == b"<doctag>Hello</doctag>"
    assert isinstance(blocks, list)


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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda _cfg=None: FakeConverter())

    req = _build_request(track="docling", source_type="txt")
    result = asyncio.run(convert(req))
    assert len(result) == 5
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# Minimal\n"
    assert docling_json_bytes is None
    assert html_bytes is None
    assert doctags_bytes is None
    assert isinstance(blocks, list)


def test_convert_works_for_odt_source_type(monkeypatch):
    """Docling-only conversion still accepts document-family formats like odt."""
    import app.domain.conversion.service as svc

    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# ODT doc\n"

        def export_to_dict(self) -> dict:
            return {"odt": True}

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str):
            return FakeResult()

    monkeypatch.setattr(svc, "_build_docling_converter", lambda _cfg=None: FakeConverter())

    req = _build_request(track="docling", source_type="odt")
    req.docling_output = OutputTarget(
        bucket="documents", key="k.docling.json",
        signed_upload_url="https://example.test/u", token=None,
    )
    result = asyncio.run(convert(req))
    assert len(result) == 5
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# ODT doc\n"
    assert docling_json_bytes is not None
    assert isinstance(blocks, list)


# ── reconstruct_from_dict tests ──


def test_reconstruct_from_dict():
    """reconstruct_from_dict returns html string and blocks list."""
    doc_dict = {
        "schema_name": "DoclingDocument",
        "version": "1.3.0",
        "name": "test",
        "origin": {"mimetype": "text/plain", "filename": "test.txt", "binary_hash": 0},
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


def test_finalize_docling_callback_persists_rows_from_callback_payload():
    captured: dict[str, list] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "blocks": [],
        "source_updates": [],
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(
                data={
                    "source_uid": "src-1",
                    "owner_id": "user-1",
                    "project_id": "proj-1",
                    "source_type": "pdf",
                    "source_locator": "uploads/src-1/file.pdf",
                    "conversion_job_id": "job-1",
                    "status": "converting",
                }
            )
            t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            update_chain = MagicMock()
            update_chain.execute.return_value = MagicMock(data=[])

            def capture_update(row):
                captured["source_updates"].append(dict(row))
                return t.update.return_value

            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = update_chain
        elif name == "conversion_parsing":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            upsert_chain = MagicMock()
            upsert_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured["conversion_parsing"].append(dict(row))
                return upsert_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name == "conversion_representations":
            upsert_chain = MagicMock()
            upsert_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured["conversion_representations"].append(dict(row))
                return upsert_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name == "blocks":
            upsert_chain = MagicMock()
            upsert_chain.execute.return_value = MagicMock(data=[])

            def capture_blocks(rows, *args, **kwargs):
                captured["blocks"].append(list(rows))
                return upsert_chain

            t.upsert.side_effect = capture_blocks
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        return t

    sb = MagicMock()
    sb.table.side_effect = table_side_effect

    body = ConversionCallbackRequest(
        source_uid="src-1",
        conversion_job_id="job-1",
        track="docling",
        md_key="converted/src-1/file.md",
        docling_key="converted/src-1/file.docling.json",
        html_key="converted/src-1/file.html",
        doctags_key="converted/src-1/file.doctags",
        success=True,
        blocks=[{
            "block_type": "paragraph",
            "block_content": "Parsed",
            "pointer": "#/texts/0",
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/0",
            "page_no": None,
            "page_nos": [],
        }],
        conv_uid="conv-123",
        docling_artifact_size_bytes=33,
        pipeline_config={"ocr": {"enabled": False}},
    )

    artifact_bytes = {
        "markdown_bytes": b"# Parsed\n",
        "html_bytes": b"<p>Parsed</p>",
        "doctags_text": b"<doctag>Parsed</doctag>",
    }

    with patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb):
        result = asyncio.run(
            finalize_docling_callback(
                body,
                sb=sb,
                artifact_bytes_by_type=artifact_bytes,
            )
        )

    assert result["ok"] is True
    assert result["status"] == "parsed"
    assert result["conv_uid"] == "conv-123"
    assert set(result["representation_types"]) == {
        "doclingdocument_json",
        "markdown_bytes",
        "html_bytes",
        "doctags_text",
    }
    assert len(captured["conversion_parsing"]) == 1
    assert len(captured["conversion_representations"]) == 4
    assert len(captured["blocks"]) == 1
    assert captured["source_updates"][-1]["status"] == "parsed"

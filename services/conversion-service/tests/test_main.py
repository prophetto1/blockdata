import asyncio
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import main as conversion_main  # noqa: E402


def _build_request(track: str | None, source_type: str) -> conversion_main.ConvertRequest:
    output = conversion_main.OutputTarget(
        bucket="documents",
        key="converted/source/file.md",
        signed_upload_url="https://example.test/upload",
        token=None,
    )
    return conversion_main.ConvertRequest(
        source_uid="source-uid",
        conversion_job_id="job-uid",
        track=track,
        source_type=source_type,
        source_download_url="https://example.test/source",
        output=output,
        callback_url="https://example.test/callback",
    )


def test_append_token_if_needed_behavior():
    assert conversion_main._append_token_if_needed("https://x.test/u", None) == "https://x.test/u"
    assert conversion_main._append_token_if_needed("https://x.test/u?token=abc", "new") == "https://x.test/u?token=abc"
    assert conversion_main._append_token_if_needed("https://x.test/u", "abc") == "https://x.test/u?token=abc"
    assert conversion_main._append_token_if_needed("https://x.test/u?a=1", "abc") == "https://x.test/u?a=1&token=abc"


def test_convert_docling_produces_all_artifacts(monkeypatch: pytest.MonkeyPatch):
    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# Docling\n"

        def export_to_html(self) -> str:
            return "<h1>Docling</h1>"

        def export_to_doctags(self) -> str:
            return "<doctag>Docling</doctag>"

        def export_to_dict(self) -> dict[str, object]:
            return {"z": 1, "a": {"d": 4, "b": 2}}

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str) -> FakeResult:
            return FakeResult()

    def fake_build_docling_converter() -> FakeConverter:
        return FakeConverter()

    monkeypatch.setattr(conversion_main, "_build_docling_converter", fake_build_docling_converter)

    req = _build_request(track="docling", source_type="html")
    req.docling_output = conversion_main.OutputTarget(
        bucket="documents",
        key="converted/source/file.docling.json",
        signed_upload_url="https://example.test/upload-docling",
        token=None,
    )
    req.html_output = conversion_main.OutputTarget(
        bucket="documents",
        key="converted/source/file.html",
        signed_upload_url="https://example.test/upload-html",
        token=None,
    )
    req.doctags_output = conversion_main.OutputTarget(
        bucket="documents",
        key="converted/source/file.doctags",
        signed_upload_url="https://example.test/upload-doctags",
        token=None,
    )

    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = asyncio.run(conversion_main._convert(req))
    assert markdown_bytes == b"# Docling\n"
    assert docling_json_bytes == b'{"a":{"b":2,"d":4},"z":1}'
    assert html_bytes == b"<h1>Docling</h1>"
    assert doctags_bytes == b"<doctag>Docling</doctag>"


def test_convert_docling_without_optional_outputs(monkeypatch: pytest.MonkeyPatch):
    class FakeDoc:
        def export_to_markdown(self) -> str:
            return "# Hello\n"

    class FakeResult:
        document = FakeDoc()

    class FakeConverter:
        def convert(self, _: str) -> FakeResult:
            return FakeResult()

    def fake_build_docling_converter() -> FakeConverter:
        return FakeConverter()

    monkeypatch.setattr(conversion_main, "_build_docling_converter", fake_build_docling_converter)

    req = _build_request(track="docling", source_type="txt")
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = asyncio.run(conversion_main._convert(req))
    assert markdown_bytes == b"# Hello\n"
    assert docling_json_bytes is None
    assert html_bytes is None
    assert doctags_bytes is None


# ── eyecite /citations endpoint ──


def test_serialize_citation_produces_expected_keys():
    from eyecite import get_citations

    cites = get_citations("531 U.S. 98")
    assert len(cites) == 1
    result = conversion_main._serialize_citation(cites[0])
    assert result["type"] == "FullCaseCitation"
    assert result["matched_text"] == "531 U.S. 98"
    assert isinstance(result["span"], list)
    assert len(result["span"]) == 2
    assert "groups" in result
    assert "metadata" in result


def test_citations_endpoint_extracts_and_resolves(monkeypatch: pytest.MonkeyPatch):
    from fastapi.testclient import TestClient

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")

    client = TestClient(conversion_main.app)
    resp = client.post(
        "/citations",
        json={"text": "Bush v. Gore, 531 U.S. 98 (2000). Id. at 109."},
        headers={"x-conversion-service-key": "test-key"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["citations"][0]["type"] == "FullCaseCitation"
    assert data["citations"][1]["type"] == "IdCitation"
    assert data["citations"][0]["resource_id"] is not None
    assert data["citations"][0]["resource_id"] == data["citations"][1]["resource_id"]
    assert len(data["resources"]) == 1


def test_citations_endpoint_rejects_missing_auth(monkeypatch: pytest.MonkeyPatch):
    from fastapi.testclient import TestClient

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")

    client = TestClient(conversion_main.app)
    resp = client.post("/citations", json={"text": "hello"})
    assert resp.status_code == 401

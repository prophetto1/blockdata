# services/platform-api/tests/test_conversion.py
import asyncio
import pytest
from app.domain.conversion.models import ConvertRequest, OutputTarget
from app.domain.conversion.service import convert, extract_docling_blocks


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


def test_convert_returns_5_tuple_with_all_artifacts(monkeypatch):
    """convert() returns (markdown, docling_json, html, doctags, blocks)."""
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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda *_args, **_kwargs: FakeConverter())
    monkeypatch.setattr(svc, "extract_docling_blocks", lambda _doc: [])

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
    assert blocks == []


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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda *_args, **_kwargs: FakeConverter())
    monkeypatch.setattr(svc, "extract_docling_blocks", lambda _doc: [])

    req = _build_request(track="docling", source_type="md")
    result = asyncio.run(convert(req))
    assert len(result) == 5
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# Minimal\n"
    assert docling_json_bytes is None
    assert html_bytes is None
    assert doctags_bytes is None
    assert blocks == []


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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda *_args, **_kwargs: FakeConverter())
    monkeypatch.setattr(svc, "extract_docling_blocks", lambda _doc: [])

    req = _build_request(track="docling", source_type="rst")
    req.docling_output = OutputTarget(
        bucket="documents", key="k.docling.json",
        signed_upload_url="https://example.test/u", token=None,
    )
    result = asyncio.run(convert(req))
    assert len(result) == 5
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# RST doc\n"
    assert docling_json_bytes is not None
    assert blocks == []


def test_extract_docling_blocks_uses_iterate_items():
    class FakeLabel:
        value = "paragraph"

    class FakeProv:
        def __init__(self, page_no: int):
            self.page_no = page_no

    class FakeTextItem:
        def __init__(self, text: str, ref: str, pages: list[int]):
            self.label = FakeLabel()
            self.text = text
            self.self_ref = ref
            self.prov = [FakeProv(page) for page in pages]

    class FakeDoc:
        groups = []  # no inline groups

        def iterate_items(self, with_groups=False):
            assert with_groups is False
            yield FakeTextItem("First block", "#/texts/0", [1, 2]), 0
            yield FakeTextItem("Second block", "#/texts/1", [2]), 1

    blocks = extract_docling_blocks(FakeDoc())

    assert blocks == [
        {
            "block_type": "paragraph",
            "block_content": "First block",
            "pointer": "#/texts/0",
            "page_no": 1,
            "page_nos": [1, 2],
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/0",
        },
        {
            "block_type": "paragraph",
            "block_content": "Second block",
            "pointer": "#/texts/1",
            "page_no": 2,
            "page_nos": [2],
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/1",
        },
    ]


def test_extract_docling_blocks_merges_inline_groups():
    """Items under an inline group should be merged into one paragraph block."""

    class FakeLabel:
        def __init__(self, value: str):
            self.value = value

    class FakeParent:
        def __init__(self, ref: str):
            self.cref = ref

    class FakeTextItem:
        def __init__(self, text: str, ref: str, parent_ref: str | None = None):
            self.label = FakeLabel("text")
            self.text = text
            self.self_ref = ref
            self.prov = []
            self.parent = FakeParent(parent_ref) if parent_ref else None

    class FakeGroup:
        def __init__(self, ref: str, label: str):
            self.self_ref = ref
            self.label = FakeLabel(label)

    class FakeDoc:
        groups = [FakeGroup("#/groups/0", "inline")]

        def iterate_items(self, with_groups=False):
            # Three fragments of one inline group + one standalone item
            yield FakeTextItem("docs", "#/texts/0", "#/groups/0"), 0
            yield FakeTextItem("[", "#/texts/1", "#/groups/0"), 0
            yield FakeTextItem("C] [legal-10] file.md", "#/texts/2", "#/groups/0"), 0
            yield FakeTextItem("Standalone paragraph", "#/texts/3"), 0

    blocks = extract_docling_blocks(FakeDoc())

    assert len(blocks) == 2
    # Inline group merged into one block
    assert blocks[0]["block_type"] == "paragraph"
    assert blocks[0]["block_content"] == "docs[C] [legal-10] file.md"
    assert blocks[0]["pointer"] == "#/groups/0"
    assert blocks[0]["parser_block_type"] == "inline"
    # Standalone item untouched
    assert blocks[1]["block_content"] == "Standalone paragraph"
    assert blocks[1]["pointer"] == "#/texts/3"


def test_convert_returns_blocks_alongside_artifacts(monkeypatch):
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

    monkeypatch.setattr(svc, "_build_docling_converter", lambda *_args, **_kwargs: FakeConverter())
    monkeypatch.setattr(
        svc,
        "extract_docling_blocks",
        lambda _doc: [{
            "block_type": "paragraph",
            "block_content": "Hello",
            "pointer": "#/texts/0",
            "page_no": 1,
            "page_nos": [1],
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/0",
        }],
    )

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
    assert len(result) == 5
    markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks = result
    assert markdown_bytes == b"# Hello\n"
    assert docling_json_bytes is not None
    assert html_bytes == b"<h1>Hello</h1>"
    assert doctags_bytes == b"<doctag>Hello</doctag>"
    assert blocks[0]["block_content"] == "Hello"

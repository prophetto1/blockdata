"""Integration tests for POST /parse route."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal

client = TestClient(app, raise_server_exceptions=False)
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="test-user",
        roles=frozenset({"authenticated"}), auth_source="supabase_jwt",
    )


def _doc_row(
    source_uid: str,
    source_type: str,
    source_locator: str,
    *,
    owner_id: str = "test-user",
    status: str = "uploaded",
):
    return {
        "source_uid": source_uid,
        "owner_id": owner_id,
        "source_type": source_type,
        "source_locator": source_locator,
        "status": status,
    }


@pytest.fixture(autouse=True)
def stub_auth():
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield
    app.dependency_overrides.clear()


# Patch get_supabase_admin at ALL import sites
SB_PATCHES = [
    "app.api.routes.parse.get_supabase_admin",
    "app.domain.conversion.repository.get_supabase_admin",
]


def _make_sb_mock(table_side_effect=None):
    """Create a supabase mock with optional table routing."""
    sb = MagicMock()
    if table_side_effect:
        sb.table.side_effect = table_side_effect
    return sb


def test_parse_route_exists():
    """POST /parse should not return 405 Method Not Allowed (route is registered)."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "x"}, headers=AUTH_HEADERS)
    # 404 = doc not found (route works), 405 = route not registered
    assert resp.status_code != 405


def test_parse_rejects_missing_source_uid():
    """POST /parse requires source_uid."""
    resp = client.post("/parse", json={}, headers=AUTH_HEADERS)
    assert resp.status_code == 422


def test_parse_rejects_unknown_source():
    """POST /parse returns 404 if source_uid not found."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "unknown"}, headers=AUTH_HEADERS)
    assert resp.status_code == 404


def test_parse_rejects_source_not_owned_by_authenticated_user():
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=_doc_row("uid-1", "java", "uploads/uid-1/Foo.java", owner_id="other-user")
    )
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)
    assert resp.status_code == 403
    assert "not owned" in resp.json()["detail"]


def test_parse_rejects_non_parseable_status():
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=_doc_row("uid-1", "java", "uploads/uid-1/Foo.java", status="parsed")
    )
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)
    assert resp.status_code == 409
    assert "Cannot parse document in status" in resp.json()["detail"]


def test_parse_tree_sitter_java():
    """Full flow: lookup doc -> download -> parse -> upload -> DB write -> 200."""
    captured: dict[str, list[dict] | dict[str, MagicMock]] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "source_documents_updates": [],
        "delete_counts": {"conversion_representations": 0, "conversion_parsing": 0},
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-1", "java", "uploads/uid-1/Foo.java")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_update(row):
                captured["source_documents_updates"].append(dict(row))
                return t.update.return_value
            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        elif name in {"conversion_representations", "conversion_parsing"}:
            if name == "conversion_parsing":
                select_chain = MagicMock()
                select_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_upsert(row, *args, **kwargs):
                captured[name].append(dict(row))
                return write_chain
            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            def capture_delete_execute():
                captured["delete_counts"][name] += 1
                return MagicMock(data=[])
            delete_chain.execute.side_effect = capture_delete_execute
            t.delete.return_value = delete_chain
        else:
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            t.update.return_value.eq.return_value = write_chain
        return t

    sb = _make_sb_mock(table_side_effect)

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock) as mock_download, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload:

        mock_download.return_value = b"package demo; public class Foo { public String getName() { return null; } }"
        mock_upload.return_value = "https://storage/path"

        resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body.get("ok") is True
    assert body.get("track") == "tree_sitter"
    assert mock_upload.call_count == 2
    assert len(captured["conversion_parsing"]) == 1
    assert len(captured["conversion_representations"]) == 2
    parsing_row = captured["conversion_parsing"][0]
    assert body.get("conv_uid") == parsing_row["conv_uid"]
    assert set(body.get("representation_types", [])) == {
        "tree_sitter_ast_json",
        "tree_sitter_symbols_json",
    }
    representation_conv_uids = {row["conv_uid"] for row in captured["conversion_representations"]}
    assert len(parsing_row["conv_uid"]) == 64
    assert parsing_row["conv_locator"] == "converted/uid-1/uid-1.ast.json"
    assert representation_conv_uids == {parsing_row["conv_uid"]}
    assert captured["delete_counts"]["conversion_representations"] == 1
    assert captured["delete_counts"]["conversion_parsing"] == 1
    assert captured["source_documents_updates"][0]["status"] == "converting"
    assert captured["source_documents_updates"][-1]["status"] == "parsed"


def test_parse_accepts_docling_source_type():
    """POST /parse accepts Docling formats and persists completion directly."""
    captured_updates: list[dict] = []
    captured: dict[str, list] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "blocks": [],
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-pdf", "pdf", "uploads/uid-pdf/doc.pdf")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_update(row):
                captured_updates.append(dict(row))
                return t.update.return_value
            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        elif name == "conversion_parsing":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = select_chain

            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured["conversion_parsing"].append(dict(row))
                return write_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name == "conversion_representations":
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured["conversion_representations"].append(dict(row))
                return write_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name == "blocks":
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(rows, *args, **kwargs):
                captured["blocks"].append(list(rows))
                return write_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        return t

    sb = _make_sb_mock(table_side_effect)
    bucket = MagicMock()
    bucket.create_signed_url.return_value = {"signedURL": "https://example.test/source-signed"}
    sb.storage.from_.return_value = bucket

    docling_result = (
        b"# Parsed\n",
        b'{"schema_name":"DoclingDocument"}',
        b"<p>Parsed</p>",
        b"<doctag>Parsed</doctag>",
        [{
            "block_type": "paragraph",
            "block_content": "Parsed",
            "pointer": "#/texts/0",
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/0",
            "page_no": None,
            "page_nos": [],
        }],
    )

    with patch.dict("os.environ", {"SUPABASE_URL": "https://example.supabase.co"}, clear=False), \
         patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.ensure_conversion_capacity", return_value=None), \
         patch("app.api.routes.parse.convert_docling", new_callable=AsyncMock) as mock_convert, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload:
        mock_convert.return_value = docling_result
        resp = client.post(
            "/parse",
            json={"source_uid": "uid-pdf", "pipeline_config": {"ocr": {"enabled": False}}},
            headers=AUTH_HEADERS,
        )

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["track"] == "docling"
    assert mock_convert.await_count == 1
    assert mock_upload.await_count == 4
    req = mock_convert.await_args.args[0]
    assert req.track == "docling"
    assert req.source_type == "pdf"
    assert req.source_download_url == "https://example.test/source-signed"
    assert req.callback_url is None
    assert req.pipeline_config == {"ocr": {"enabled": False}}
    assert req.output.key == "converted/uid-pdf/doc.md"
    assert req.docling_output.key == "converted/uid-pdf/doc.docling.json"
    assert req.html_output.key == "converted/uid-pdf/doc.html"
    assert req.doctags_output.key == "converted/uid-pdf/doc.doctags"
    assert captured_updates[0]["status"] == "converting"
    assert captured_updates[-1]["status"] == "parsed"
    assert len(captured["conversion_parsing"]) == 1
    assert len(captured["conversion_representations"]) == 4
    assert len(captured["blocks"]) == 1
    parsing_row = captured["conversion_parsing"][0]
    assert body["conv_uid"] == parsing_row["conv_uid"]
    assert set(body["representation_types"]) == {
        "doclingdocument_json",
        "markdown_bytes",
        "html_bytes",
        "doctags_text",
    }
    representation_conv_uids = {row["conv_uid"] for row in captured["conversion_representations"]}
    assert representation_conv_uids == {parsing_row["conv_uid"]}
    assert parsing_row["conv_locator"] == "converted/uid-pdf/doc.docling.json"
    assert parsing_row["conv_total_blocks"] == 1
    assert parsing_row["conv_total_characters"] == len("Parsed")
    assert parsing_row["conv_representation_type"] == "doclingdocument_json"
    assert parsing_row["requested_pipeline_config"] == {"ocr": {"enabled": False}}
    assert captured["blocks"][0][0]["block_uid"] == f"{parsing_row['conv_uid']}:0"
    assert captured["blocks"][0][0]["block_content"] == "Parsed"


def test_parse_docling_returns_500_when_conversion_fails():
    captured_updates: list[dict] = []

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-pdf", "pdf", "uploads/uid-pdf/doc.pdf")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_update(row):
                captured_updates.append(dict(row))
                return t.update.return_value
            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        elif name == "conversion_parsing":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name in {"conversion_representations", "blocks"}:
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        return t

    sb = _make_sb_mock(table_side_effect)
    bucket = MagicMock()
    bucket.create_signed_url.return_value = {"signedURL": "https://example.test/source-signed"}
    sb.storage.from_.return_value = bucket

    with patch.dict("os.environ", {"SUPABASE_URL": "https://example.supabase.co"}, clear=False), \
         patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.ensure_conversion_capacity", return_value=None), \
         patch("app.api.routes.parse.convert_docling", new_callable=AsyncMock) as mock_convert, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload:
        mock_convert.side_effect = RuntimeError("docling boom")
        resp = client.post("/parse", json={"source_uid": "uid-pdf"}, headers=AUTH_HEADERS)

    assert resp.status_code == 500
    assert "docling boom" in resp.json()["detail"]
    assert mock_upload.await_count == 0
    assert captured_updates[0]["status"] == "converting"
    assert captured_updates[-1]["status"] == "conversion_failed"


def test_parse_docling_returns_parse_failed_when_persistence_fails():
    captured_updates: list[dict] = []

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-pdf", "pdf", "uploads/uid-pdf/doc.pdf")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_update(row):
                captured_updates.append(dict(row))
                return t.update.return_value

            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        elif name == "conversion_parsing":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        elif name in {"conversion_representations", "blocks"}:
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        return t

    sb = _make_sb_mock(table_side_effect)
    bucket = MagicMock()
    bucket.create_signed_url.return_value = {"signedURL": "https://example.test/source-signed"}
    sb.storage.from_.return_value = bucket

    docling_result = (
        b"# Parsed\n",
        b'{"schema_name":"DoclingDocument"}',
        b"<p>Parsed</p>",
        b"<doctag>Parsed</doctag>",
        [{
            "block_type": "paragraph",
            "block_content": "Parsed",
            "pointer": "#/texts/0",
            "parser_block_type": "paragraph",
            "parser_path": "#/texts/0",
            "page_no": None,
            "page_nos": [],
        }],
    )

    with patch.dict("os.environ", {"SUPABASE_URL": "https://example.supabase.co"}, clear=False), \
         patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.ensure_conversion_capacity", return_value=None), \
         patch("app.api.routes.parse.convert_docling", new_callable=AsyncMock) as mock_convert, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock), \
         patch("app.domain.conversion.finalize.upsert_blocks", side_effect=RuntimeError("persist boom")):
        mock_convert.return_value = docling_result
        resp = client.post("/parse", json={"source_uid": "uid-pdf"}, headers=AUTH_HEADERS)

    assert resp.status_code == 500
    assert "persist boom" in resp.json()["detail"]
    assert captured_updates[0]["status"] == "converting"
    assert captured_updates[-1]["status"] == "parse_failed"


def test_parse_tree_sitter_cleans_partial_rows_on_failure():
    captured: dict[str, list[dict] | dict[str, MagicMock]] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "source_documents_updates": [],
        "delete_counts": {"conversion_representations": 0, "conversion_parsing": 0},
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-1", "java", "uploads/uid-1/Foo.java")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_update(row):
                captured["source_documents_updates"].append(dict(row))
                return t.update.return_value
            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        elif name in {"conversion_representations", "conversion_parsing"}:
            if name == "conversion_parsing":
                select_chain = MagicMock()
                select_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_upsert(row, *args, **kwargs):
                captured[name].append(dict(row))
                return write_chain
            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            def capture_delete_execute():
                captured["delete_counts"][name] += 1
                return MagicMock(data=[])
            delete_chain.execute.side_effect = capture_delete_execute
            t.delete.return_value = delete_chain
        else:
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            t.update.return_value.eq.return_value = write_chain
        return t

    sb = _make_sb_mock(table_side_effect)

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock) as mock_download, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload:

        mock_download.return_value = b"package demo; public class Foo { public String getName() { return null; } }"
        mock_upload.side_effect = ["https://storage/ast", RuntimeError("upload boom")]

        resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)

    assert resp.status_code == 500
    assert "upload boom" in resp.json()["detail"]
    assert len(captured["conversion_representations"]) == 1
    assert captured["delete_counts"]["conversion_representations"] == 2
    assert captured["delete_counts"]["conversion_parsing"] == 2
    assert captured["source_documents_updates"][0]["status"] == "converting"
    assert captured["source_documents_updates"][-1]["status"] == "conversion_failed"


def test_parse_routes_markdown_to_mdast():
    captured: dict[str, list[dict] | dict[str, int]] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "source_documents_updates": [],
        "delete_counts": {"conversion_representations": 0, "conversion_parsing": 0},
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-md", "md", "uploads/uid-md/readme.md")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_update(row):
                captured["source_documents_updates"].append(dict(row))
                return t.update.return_value

            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name in {"conversion_representations", "conversion_parsing"}:
            if name == "conversion_parsing":
                select_chain = MagicMock()
                select_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured[name].append(dict(row))
                return write_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain

            def capture_delete_execute():
                captured["delete_counts"][name] += 1
                return MagicMock(data=[])

            delete_chain.execute.side_effect = capture_delete_execute
            t.delete.return_value = delete_chain
        elif name == "blocks":
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        else:
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            t.update.return_value.eq.return_value = write_chain
        return t

    sb = _make_sb_mock(table_side_effect)

    markdown_result = MagicMock(
        mdast_json=b'{"type":"root","children":[]}',
        markdown_bytes=b"# Hello\n",
        source_type="md",
    )

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock) as mock_download, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload, \
         patch("app.api.routes.parse.parse_markdown_source", new_callable=AsyncMock) as mock_parse_markdown:

        mock_download.return_value = b"# Hello\n"
        mock_parse_markdown.return_value = markdown_result

        resp = client.post("/parse", json={"source_uid": "uid-md"}, headers=AUTH_HEADERS)

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["track"] == "mdast"
    assert body["representation_types"] == ["mdast_json", "markdown_bytes"]
    assert mock_upload.await_count == 2
    assert mock_parse_markdown.await_count == 1
    assert len(captured["conversion_parsing"]) == 1
    assert len(captured["conversion_representations"]) == 2
    parsing_row = captured["conversion_parsing"][0]
    assert body["conv_uid"] == parsing_row["conv_uid"]
    assert parsing_row["conv_parsing_tool"] == "mdast"
    assert parsing_row["conv_locator"] == "converted/uid-md/readme.mdast.json"
    assert parsing_row["conv_representation_type"] == "mdast_json"
    representation_types = {row["representation_type"] for row in captured["conversion_representations"]}
    assert representation_types == {"mdast_json", "markdown_bytes"}
    representation_conv_uids = {row["conv_uid"] for row in captured["conversion_representations"]}
    assert representation_conv_uids == {parsing_row["conv_uid"]}
    assert captured["source_documents_updates"][0]["status"] == "converting"
    assert captured["source_documents_updates"][-1]["status"] == "parsed"


def test_parse_routes_pandoc_alpha_source_type():
    captured: dict[str, list[dict] | dict[str, int]] = {
        "conversion_parsing": [],
        "conversion_representations": [],
        "source_documents_updates": [],
        "delete_counts": {"conversion_representations": 0, "conversion_parsing": 0},
    }

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = _doc_row("uid-rst", "rst", "uploads/uid-rst/spec.rst")
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_update(row):
                captured["source_documents_updates"].append(dict(row))
                return t.update.return_value

            t.update.side_effect = capture_update
            t.update.return_value.eq.return_value = write_chain
        elif name in {"conversion_representations", "conversion_parsing"}:
            if name == "conversion_parsing":
                select_chain = MagicMock()
                select_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = select_chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])

            def capture_upsert(row, *args, **kwargs):
                captured[name].append(dict(row))
                return write_chain

            t.upsert.side_effect = capture_upsert
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain

            def capture_delete_execute():
                captured["delete_counts"][name] += 1
                return MagicMock(data=[])

            delete_chain.execute.side_effect = capture_delete_execute
            t.delete.return_value = delete_chain
        elif name == "blocks":
            delete_chain = MagicMock()
            delete_chain.eq.return_value = delete_chain
            delete_chain.execute.return_value = MagicMock(data=[])
            t.delete.return_value = delete_chain
        else:
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            t.update.return_value.eq.return_value = write_chain
        return t

    sb = _make_sb_mock(table_side_effect)

    pandoc_result = MagicMock(
        pandoc_ast_json=b'{"pandoc-api-version":[1,23],"blocks":[]}',
        source_type="rst",
        input_format="rst",
    )

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock) as mock_download, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload, \
         patch("app.api.routes.parse.parse_pandoc_source", new_callable=AsyncMock) as mock_parse_pandoc:

        mock_download.return_value = b"Heading\n=======\n"
        mock_parse_pandoc.return_value = pandoc_result

        resp = client.post("/parse", json={"source_uid": "uid-rst"}, headers=AUTH_HEADERS)

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["track"] == "pandoc"
    assert body["representation_types"] == ["pandoc_ast_json"]
    assert mock_upload.await_count == 1
    assert mock_parse_pandoc.await_count == 1
    assert len(captured["conversion_parsing"]) == 1
    assert len(captured["conversion_representations"]) == 1
    parsing_row = captured["conversion_parsing"][0]
    assert body["conv_uid"] == parsing_row["conv_uid"]
    assert parsing_row["conv_parsing_tool"] == "pandoc"
    assert parsing_row["conv_locator"] == "converted/uid-rst/spec.pandoc.json"
    assert parsing_row["conv_representation_type"] == "pandoc_ast_json"
    representation_row = captured["conversion_representations"][0]
    assert representation_row["representation_type"] == "pandoc_ast_json"
    assert representation_row["conv_uid"] == parsing_row["conv_uid"]
    assert captured["source_documents_updates"][0]["status"] == "converting"
    assert captured["source_documents_updates"][-1]["status"] == "parsed"

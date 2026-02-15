from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def test_general_partition_requires_api_key_when_configured(monkeypatch):
    monkeypatch.setenv("UNSTRUCTURED_API_KEY", "expected-api-key")
    client = TestClient(app)

    resp = client.post(
        "/general/v0/general",
        files=[("files", ("sample.txt", b"hello", "text/plain"))],
        data={"output_format": "application/json"},
    )
    assert resp.status_code == 401


def test_general_partition_returns_unstructured_style_elements_list(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)

    resp = client.post(
        "/general/v0/general",
        files=[("files", ("sample.txt", b"hello", "text/plain"))],
        data={
            "coordinates": "true",
            "strategy": "auto",
            "output_format": "application/json",
            "unique_element_ids": "false",
            "chunking_strategy": "by_title",
        },
    )
    assert resp.status_code == 200
    assert "x-track-b-partition-backend" in resp.headers
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    first = body[0]
    assert isinstance(first.get("type"), str)
    assert len(first["type"]) > 0
    assert "element_id" in first
    assert "metadata" in first


def test_general_partition_supports_text_csv_output(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)

    resp = client.post(
        "/general/v0/general",
        files=[("files", ("sample.txt", b"hello", "text/plain"))],
        data={
            "output_format": "text/csv",
            "coordinates": "false",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "type,element_id,text" in resp.text


def test_general_partition_rejects_unsupported_accept_for_multi_file(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)

    resp = client.post(
        "/general/v0/general",
        headers={"Accept": "application/xml"},
        files=[
            ("files", ("a.txt", b"hello", "text/plain")),
            ("files", ("b.txt", b"world", "text/plain")),
        ],
        data={"output_format": "application/json"},
    )
    assert resp.status_code == 406


def test_general_partition_get_is_not_allowed(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)
    resp = client.get("/general/v0/general")
    assert resp.status_code == 405
    assert resp.json()["detail"] == "Only POST requests are supported."


def test_general_partition_v1_alias_path_works(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)
    resp = client.post(
        "/general/v1/general",
        files=[("files", ("sample.txt", b"hello", "text/plain"))],
        data={"output_format": "application/json"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_general_partition_supports_multipart_mixed_response(monkeypatch):
    monkeypatch.delenv("UNSTRUCTURED_API_KEY", raising=False)
    client = TestClient(app)
    resp = client.post(
        "/general/v0/general",
        headers={"Accept": "multipart/mixed"},
        files=[
            ("files", ("a.txt", b"hello", "text/plain")),
            ("files", ("b.txt", b"world", "text/plain")),
        ],
        data={"output_format": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("multipart/mixed")
    assert '"type":' in resp.text

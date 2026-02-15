from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def test_partition_endpoint_requires_key_when_configured(monkeypatch):
    monkeypatch.setenv("TRACK_B_SERVICE_KEY", "expected-key")
    client = TestClient(app)

    resp = client.post(
        "/partition",
        json={
            "source_uid": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "source_type": "pdf",
            "source_locator": "uploads/doc.pdf",
            "doc_title": "Sample Title",
            "partition_parameters": {
                "coordinates": True,
                "strategy": "auto",
                "output_format": "application/json",
                "unique_element_ids": False,
                "chunking_strategy": "by_title",
            },
        },
    )
    assert resp.status_code == 401


def test_partition_endpoint_accepts_valid_key(monkeypatch):
    monkeypatch.setenv("TRACK_B_SERVICE_KEY", "expected-key")
    client = TestClient(app)

    resp = client.post(
        "/partition",
        headers={"X-Track-B-Service-Key": "expected-key"},
        json={
            "source_uid": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "source_type": "pdf",
            "source_locator": "uploads/doc.pdf",
            "doc_title": "Sample Title",
            "partition_parameters": {
                "coordinates": True,
                "strategy": "auto",
                "output_format": "application/json",
                "unique_element_ids": False,
                "chunking_strategy": "by_title",
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body.get("elements"), list)
    first = body["elements"][0]
    assert first["type"] == "Title"
    assert "element_id" in first
    assert "metadata" in first
    assert "coordinates" in first["metadata"]


def test_partition_endpoint_rejects_invalid_partition_parameters(monkeypatch):
    monkeypatch.setenv("TRACK_B_SERVICE_KEY", "expected-key")
    client = TestClient(app)
    resp = client.post(
        "/partition",
        headers={"X-Track-B-Service-Key": "expected-key"},
        json={
            "source_uid": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "source_type": "pdf",
            "partition_parameters": {
                "output_format": "application/xml",
            },
        },
    )
    assert resp.status_code == 422

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app()
    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()


def test_functions_endpoint_lists_javalang_functions(client):
    response = client.get("/functions")
    assert response.status_code == 200
    names = {row["function_name"] for row in response.json()}
    assert "javalang_tokenize" in names
    assert "javalang_parse" in names


def test_plugin_execution_route_executes_javalang_tokenize(client):
    response = client.post(
        "/javalang_tokenize",
        json={"params": {"code": "class Test {}"}},
        headers={"Authorization": "Bearer test-key"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["function_name"] == "javalang_tokenize"
    assert body["output"]["state"] == "SUCCESS"
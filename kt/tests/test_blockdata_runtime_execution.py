from __future__ import annotations

import mongomock

from blockdata.runtime.execution import ExecutionRequest, execute_function


def test_execute_function_runs_mongodb_flow(monkeypatch) -> None:
    client = mongomock.MongoClient()
    monkeypatch.setattr("blockdata.connectors.mongodb.mongodb_connection.MongoClientFactory.create", lambda uri: client)

    insert_result = execute_function(
        "mongodb_insertone",
        ExecutionRequest(
            params={
                "connection": {"uri": "mongodb://example"},
                "database": "demo",
                "collection": "people",
                "document": {"name": "Ada"},
            },
            execution_id="exec-shell",
        ),
    )
    inserted_id = insert_result.output["inserted_id"]
    assert inserted_id

    find_result = execute_function(
        "mongodb_find",
        ExecutionRequest(
            params={
                "connection": {"uri": "mongodb://example"},
                "database": "demo",
                "collection": "people",
                "filter": {"_id": {"$oid": inserted_id}},
            },
            execution_id="exec-shell",
        ),
    )
    assert find_result.output["size"] == 1
    assert find_result.output["rows"][0]["name"] == "Ada"


def test_execute_function_resolves_connection_id(monkeypatch) -> None:
    client = mongomock.MongoClient()
    monkeypatch.setattr("blockdata.connectors.mongodb.mongodb_connection.MongoClientFactory.create", lambda uri: client)
    monkeypatch.setenv("CONNECTION_demo_URI", "mongodb://resolved")

    result = execute_function(
        "mongodb_insertone",
        ExecutionRequest(
            params={
                "connection": {"connectionId": "demo"},
                "database": "demo",
                "collection": "people",
                "document": {"name": "Grace"},
            },
            execution_id="exec-shell",
            user_id="user-1",
        ),
    )

    assert result.output["was_acknowledged"] is True
    assert result.output["inserted_id"]

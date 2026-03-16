from __future__ import annotations

import json

import mongomock

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.common import FetchType
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.aggregate import Aggregate
from blockdata.connectors.mongodb.load import Load
from blockdata.connectors.mongodb.mongodb_connection import MongoDbConnection
from blockdata.connectors.mongodb.trigger import Trigger


def _connection() -> MongoDbConnection:
    return MongoDbConnection(uri=Property.of_value("mongodb://example"))


def test_load_aggregate_and_trigger_flow(monkeypatch) -> None:
    client = mongomock.MongoClient()
    monkeypatch.setattr("blockdata.connectors.mongodb.mongodb_connection.MongoClientFactory.create", lambda uri: client)

    context = RunContext(execution_id="exec-1")
    source_uri = context.storage.put_file_bytes(
        "load.jsonl",
        b"\n".join(
            [
                json.dumps({"id": "507f1f77bcf86cd799439011", "name": "Book One", "category": "Fiction", "price": 25.99, "status": "available"}).encode(),
                json.dumps({"id": "507f1f77bcf86cd799439012", "name": "Book Two", "category": "Fiction", "price": 19.99, "status": "available"}).encode(),
                json.dumps({"id": "507f1f77bcf86cd799439013", "name": "Book Three", "category": "Science", "price": 45.99, "status": "available"}).encode(),
            ]
        ),
    )

    load = Load(
        connection=_connection(),
        database=Property.of_value("demo"),
        collection=Property.of_value("books"),
        from_=Property.of_value(source_uri),
        chunk=Property.of_value(2),
        id_key=Property.of_value("id"),
    )
    load_output = load.run(context)
    assert load_output.size == 3
    assert load_output.inserted_count == 3
    assert context.metric_value("requests.count") == 2
    assert context.metric_value("records") == 3

    aggregate = Aggregate(
        connection=_connection(),
        database=Property.of_value("demo"),
        collection=Property.of_value("books"),
        pipeline=Property.of_value(
            [
                {"$match": {"status": "available"}},
                {"$group": {"_id": "$category", "totalBooks": {"$sum": 1}}},
                {"$sort": {"totalBooks": -1}},
            ]
        ),
        store=Property.of_value(FetchType.FETCH),
    )
    aggregate_output = aggregate.run(context)
    assert aggregate_output.size == 2
    assert aggregate_output.rows[0]["_id"] == "Fiction"
    assert aggregate_output.rows[0]["totalBooks"] == 2

    trigger = Trigger(
        id="watch-books",
        connection=_connection(),
        database=Property.of_value("demo"),
        collection=Property.of_value("books"),
        filter={"status": "available"},
    )
    execution = trigger.evaluate(context)
    assert execution is not None
    assert execution["trigger"]["rows"][0]["name"] == "Book One"

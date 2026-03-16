from __future__ import annotations

import mongomock

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.delete import Delete, DeleteOperation
from blockdata.connectors.mongodb.find import Find
from blockdata.connectors.mongodb.insert_one import InsertOne
from blockdata.connectors.mongodb.mongodb_connection import MongoDbConnection
from blockdata.connectors.mongodb.update import Update, UpdateOperation


def _connection() -> MongoDbConnection:
    return MongoDbConnection(uri=Property.of_value("mongodb://example"))


def _context() -> RunContext:
    return RunContext(variables={"person": "John Doe"})


def test_crud_flow_against_mocked_mongodb(monkeypatch) -> None:
    client = mongomock.MongoClient()
    monkeypatch.setattr("blockdata.connectors.mongodb.mongodb_connection.MongoClientFactory.create", lambda uri: client)

    context = _context()
    connection = _connection()

    insert = InsertOne(
        connection=connection,
        database=Property.of_value("demo"),
        collection=Property.of_value("people"),
        document={"name": "{{ person }}", "tags": ["blue", "green", "red"]},
    )
    insert_output = insert.run(context)
    assert insert_output.was_acknowledged is True
    assert insert_output.inserted_id

    update = Update(
        connection=connection,
        database=Property.of_value("demo"),
        collection=Property.of_value("people"),
        document={"$set": {"tags": ["green", "red"]}},
        filter={"_id": {"$oid": insert_output.inserted_id}},
        operation=Property.of_value(UpdateOperation.UPDATE_ONE),
    )
    update_output = update.run(context)
    assert update_output.matched_count == 1
    assert update_output.modified_count == 1

    find = Find(
        connection=connection,
        database=Property.of_value("demo"),
        collection=Property.of_value("people"),
        filter={"_id": {"$oid": insert_output.inserted_id}},
    )
    find_output = find.run(context)
    assert find_output.size == 1
    assert find_output.rows[0]["_id"] == insert_output.inserted_id
    assert list(find_output.rows[0].keys()) == ["_id", "name", "tags"]

    delete = Delete(
        connection=connection,
        database=Property.of_value("demo"),
        collection=Property.of_value("people"),
        filter={"_id": {"$oid": insert_output.inserted_id}},
        operation=Property.of_value(DeleteOperation.DELETE_ONE),
    )
    delete_output = delete.run(context)
    assert delete_output.deleted_count == 1
    assert delete_output.was_acknowledged is True

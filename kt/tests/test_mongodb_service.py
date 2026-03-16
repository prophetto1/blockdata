from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timezone

import pytest
from bson import Binary, Decimal128, Int64, ObjectId

from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


def test_to_document_renders_string_template() -> None:
    context = RunContext(variables={"name": "Ada"})

    doc = MongoDbService.to_document(context, '{"name": "{{ name }}"}')

    assert doc == {"name": "Ada"}


def test_to_document_renders_mapping_template() -> None:
    context = RunContext(variables={"name": "Ada"})

    doc = MongoDbService.to_document(context, {"name": "{{ name }}", "active": True})

    assert doc == {"name": "Ada", "active": True}


def test_to_document_none_returns_empty_mapping() -> None:
    context = RunContext()

    assert MongoDbService.to_document(context, None) == {}


def test_to_document_invalid_value_raises() -> None:
    context = RunContext()

    with pytest.raises(TypeError):
        MongoDbService.to_document(context, 42)


def test_map_value_preserves_supported_types_and_field_order() -> None:
    object_id = ObjectId()
    value = OrderedDict(
        [
            ("_id", object_id),
            ("name", "Ada"),
            ("score", 7),
            ("long_value", Int64(99)),
            ("ratio", 1.5),
            ("price", Decimal128("12.50")),
            ("payload", Binary(b"abc")),
            ("enabled", True),
            ("created_at", datetime(2024, 1, 2, tzinfo=timezone.utc)),
            ("items", [1, "two", {"nested": 3}]),
        ]
    )

    mapped = MongoDbService.map_value(value)

    assert list(mapped.keys()) == [
        "_id",
        "name",
        "score",
        "long_value",
        "ratio",
        "price",
        "payload",
        "enabled",
        "created_at",
        "items",
    ]
    assert mapped["_id"] == str(object_id)
    assert mapped["payload"] == b"abc"
    assert mapped["created_at"] == datetime(2024, 1, 2, tzinfo=timezone.utc)

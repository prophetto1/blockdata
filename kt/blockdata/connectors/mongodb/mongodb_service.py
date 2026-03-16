from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Mapping

from bson import Binary, Decimal128, Int64, ObjectId
from bson.json_util import dumps, loads
from bson.timestamp import Timestamp

from blockdata.core.runners.run_context import RunContext


class MongoDbService:
    @staticmethod
    def to_document(run_context: RunContext, value: Any) -> dict[str, Any]:
        if isinstance(value, str):
            rendered = run_context.render(value).as_type(str).or_else_throw()
            return loads(rendered)

        if isinstance(value, Mapping):
            rendered = run_context.render(value).value
            return loads(dumps(rendered))

        if value is None:
            return {}

        raise TypeError(f"Invalid value type {type(value)!r}")

    @staticmethod
    def map_value(value: Any) -> Any:
        if value is None:
            return None

        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, Binary):
            return bytes(value)

        if isinstance(value, Decimal128):
            return value.to_decimal()

        if isinstance(value, Decimal):
            return value

        if isinstance(value, Int64):
            return int(value)

        if isinstance(value, Timestamp):
            return datetime.fromtimestamp(value.time, tz=timezone.utc)

        if isinstance(value, datetime):
            return value

        if isinstance(value, Mapping):
            ordered = OrderedDict()
            if "_id" in value:
                ordered["_id"] = MongoDbService.map_value(value["_id"])
            for key, item in value.items():
                if key == "_id":
                    continue
                ordered[key] = MongoDbService.map_value(item)
            return ordered

        if isinstance(value, list):
            return [MongoDbService.map_value(item) for item in value]

        if isinstance(value, tuple):
            return [MongoDbService.map_value(item) for item in value]

        if isinstance(value, (bytes, bytearray)):
            return bytes(value)

        return value

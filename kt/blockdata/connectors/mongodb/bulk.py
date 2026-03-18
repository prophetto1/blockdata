from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, TextIO

from bson.json_util import loads

from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_load import AbstractLoad
from blockdata.connectors.mongodb.write_models import (
    DeleteManyModel,
    DeleteOneModel,
    InsertOneModel,
    ReplaceOneModel,
    UpdateManyModel,
    UpdateOneModel,
    WriteModel,
)


@dataclass(slots=True, kw_only=True)
class Bulk(AbstractLoad):
    def source(self, run_context: RunContext, input_stream: TextIO) -> Iterable[WriteModel]:
        del run_context
        for row in input_stream:
            row = row.strip()
            if not row:
                continue

            bson_document = loads(row)
            operation_name, operation_value = next(iter(bson_document.items()))

            if operation_name == "insertOne":
                yield InsertOneModel(document=operation_value)
            elif operation_name == "replaceOne":
                yield ReplaceOneModel(
                    filter=operation_value["filter"],
                    replacement=operation_value["replacement"],
                    options=self._operation_options(operation_value),
                )
            elif operation_name == "updateOne":
                yield UpdateOneModel(
                    filter=operation_value["filter"],
                    update=operation_value["update"],
                    options=self._operation_options(operation_value),
                )
            elif operation_name == "updateMany":
                yield UpdateManyModel(
                    filter=operation_value["filter"],
                    update=operation_value["update"],
                    options=self._operation_options(operation_value),
                )
            elif operation_name == "deleteOne":
                yield DeleteOneModel(
                    filter=operation_value["filter"],
                    options=self._delete_options(operation_value),
                )
            elif operation_name == "deleteMany":
                yield DeleteManyModel(
                    filter=operation_value["filter"],
                    options=self._delete_options(operation_value),
                )
            else:
                raise ValueError(f"Invalid bulk request type in row {row!r}")

    @staticmethod
    def _operation_options(operation_value: dict[str, object]) -> dict[str, object]:
        options: dict[str, object] = {}
        for key in ("upsert", "bypassDocumentValidation", "collation", "arrayFilters"):
            if key in operation_value:
                options[key] = operation_value[key]
        return options

    @staticmethod
    def _delete_options(operation_value: dict[str, object]) -> dict[str, object]:
        options: dict[str, object] = {}
        if "collation" in operation_value:
            options["collation"] = operation_value["collation"]
        return options

from __future__ import annotations

import io
from contextlib import closing
from dataclasses import dataclass, field
from typing import Iterable, TextIO

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.write_models import (
    BulkWriteSummary,
    DeleteManyModel,
    DeleteOneModel,
    InsertOneModel,
    ReplaceOneModel,
    UpdateManyModel,
    UpdateOneModel,
    WriteModel,
)


def _to_pymongo_operation(op: WriteModel):
    """Convert a BD WriteModel dataclass to the corresponding pymongo operation."""
    from pymongo import operations as pymongo_ops

    if isinstance(op, InsertOneModel):
        return pymongo_ops.InsertOne(op.document)
    if isinstance(op, ReplaceOneModel):
        return pymongo_ops.ReplaceOne(
            op.filter, op.replacement,
            upsert=op.options.get("upsert", False),
            collation=op.options.get("collation"),
        )
    if isinstance(op, UpdateOneModel):
        return pymongo_ops.UpdateOne(
            op.filter, op.update,
            upsert=op.options.get("upsert", False),
            array_filters=op.options.get("arrayFilters"),
            collation=op.options.get("collation"),
        )
    if isinstance(op, UpdateManyModel):
        return pymongo_ops.UpdateMany(
            op.filter, op.update,
            upsert=op.options.get("upsert", False),
            array_filters=op.options.get("arrayFilters"),
            collation=op.options.get("collation"),
        )
    if isinstance(op, DeleteOneModel):
        return pymongo_ops.DeleteOne(
            op.filter,
            collation=op.options.get("collation"),
        )
    if isinstance(op, DeleteManyModel):
        return pymongo_ops.DeleteMany(
            op.filter,
            collation=op.options.get("collation"),
        )
    raise TypeError(f"Unsupported write model {type(op)!r}")


@dataclass(slots=True)
class AbstractLoadOutput:
    size: int
    inserted_count: int = 0
    matched_count: int = 0
    deleted_count: int = 0
    modified_count: int = 0


@dataclass(slots=True, kw_only=True)
class AbstractLoad(AbstractTask):
    from_: Property[str]
    chunk: Property[int] = field(default_factory=lambda: Property.of_value(1000))

    def source(self, run_context: RunContext, input_stream: TextIO) -> Iterable[WriteModel]:
        raise NotImplementedError

    def run(self, run_context: RunContext) -> AbstractLoadOutput:
        source_uri = run_context.render(self.from_).as_type(str).or_else_throw()

        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            chunk_size = max(run_context.render(self.chunk).as_type(int).or_else(1000), 1)

            total_records = 0
            request_count = 0
            summary = BulkWriteSummary()
            buffered: list[WriteModel] = []

            with run_context.storage.get_file(source_uri) as source_stream:
                text_stream = io.TextIOWrapper(source_stream, encoding="utf-8")
                try:
                    for write_model in self.source(run_context, text_stream):
                        total_records += 1
                        buffered.append(write_model)

                        if len(buffered) >= chunk_size:
                            self._merge_summary(summary, self._apply_bulk(collection, buffered))
                            request_count += 1
                            buffered = []
                finally:
                    text_stream.detach()

            if buffered:
                self._merge_summary(summary, self._apply_bulk(collection, buffered))
                request_count += 1

        run_context.metric("requests.count", request_count)
        run_context.metric("records", total_records)
        run_context.logger().info(
            "Successfully sent %s requests for %s records",
            request_count,
            total_records,
        )

        return AbstractLoadOutput(
            size=total_records,
            inserted_count=summary.inserted_count,
            matched_count=summary.matched_count,
            modified_count=summary.modified_count,
            deleted_count=summary.deleted_count,
        )

    def _apply_bulk(self, collection, operations: list[WriteModel]) -> BulkWriteSummary:
        if not operations:
            return BulkWriteSummary()

        pymongo_requests = [_to_pymongo_operation(op) for op in operations]
        result = collection.bulk_write(pymongo_requests, ordered=True)
        return BulkWriteSummary(
            inserted_count=getattr(result, "inserted_count", 0),
            matched_count=getattr(result, "matched_count", 0),
            modified_count=getattr(result, "modified_count", 0),
            deleted_count=getattr(result, "deleted_count", 0),
        )

    @staticmethod
    def _merge_summary(target: BulkWriteSummary, delta: BulkWriteSummary) -> None:
        target.inserted_count += delta.inserted_count
        target.matched_count += delta.matched_count
        target.modified_count += delta.modified_count
        target.deleted_count += delta.deleted_count

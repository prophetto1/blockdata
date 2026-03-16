from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.find import Find
from blockdata.connectors.mongodb.mongodb_connection import MongoDbConnection


@dataclass(slots=True, kw_only=True)
class Trigger:
    id: str | None = None
    interval: timedelta = timedelta(seconds=60)
    connection: MongoDbConnection
    database: Property[str]
    collection: Property[str]
    filter: object | None = None
    projection: object | None = None
    sort: object | None = None
    limit: Property[int] | None = None
    skip: Property[int] | None = None
    store: Property[bool] = field(default_factory=lambda: Property.of_value(False))

    def evaluate(self, run_context: RunContext) -> dict[str, object] | None:
        find = Find(
            id=self.id,
            type="blockdata.connectors.mongodb.find.Find",
            connection=self.connection,
            database=self.database,
            collection=self.collection,
            filter=self.filter,
            projection=self.projection,
            sort=self.sort,
            limit=self.limit,
            skip=self.skip,
            store=self.store,
        )

        output = find.run(run_context)
        if output.size == 0:
            return None

        return {
            "trigger": {
                "rows": output.rows,
                "size": output.size,
                "uri": output.uri,
            }
        }

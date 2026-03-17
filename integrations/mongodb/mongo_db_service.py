from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MongoDbService:

    def to_document(self, run_context: RunContext, value: Any) -> BsonDocument:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, doc: BsonValue) -> Any:
        raise NotImplementedError  # TODO: translate from Java

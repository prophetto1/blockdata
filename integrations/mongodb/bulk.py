from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Bulk(AbstractLoad):
    """Run MongoDB bulkWrite from NDJSON"""

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[WriteModel[Bson]]:
        raise NotImplementedError  # TODO: translate from Java

    def nd_j_son_reader(self, input: BufferedReader) -> Consumer[FluxSink[WriteModel[Bson]]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_replace_options(self, document: BsonDocument) -> ReplaceOptions:
        raise NotImplementedError  # TODO: translate from Java

    def get_update_options(self, document: BsonDocument) -> UpdateOptions:
        raise NotImplementedError  # TODO: translate from Java

    def get_collation(self, document: BsonDocument) -> Collation:
        raise NotImplementedError  # TODO: translate from Java

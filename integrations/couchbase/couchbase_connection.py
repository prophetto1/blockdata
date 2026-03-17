from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.couchbase.couchbase_connection_interface import CouchbaseConnectionInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class CouchbaseConnection(Task, CouchbaseConnectionInterface):
    connection_string: str
    username: str
    password: str

    def connect(self, run_context: RunContext) -> Cluster:
        raise NotImplementedError  # TODO: translate from Java

    def authentication_options(self, run_context: RunContext) -> ClusterOptions:
        raise NotImplementedError  # TODO: translate from Java

    def close(self, cluster: Cluster) -> None:
        raise NotImplementedError  # TODO: translate from Java

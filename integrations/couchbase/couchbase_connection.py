from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-couchbase\src\main\java\io\kestra\plugin\couchbase\CouchbaseConnection.java
# WARNING: Unresolved types: Cluster, ClusterOptions

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.couchbase.couchbase_connection_interface import CouchbaseConnectionInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class CouchbaseConnection(ABC, Task):
    connection_string: str
    username: str
    password: str

    def connect(self, run_context: RunContext) -> Cluster:
        raise NotImplementedError  # TODO: translate from Java

    def authentication_options(self, run_context: RunContext) -> ClusterOptions:
        raise NotImplementedError  # TODO: translate from Java

    def close(self, cluster: Cluster) -> None:
        raise NotImplementedError  # TODO: translate from Java

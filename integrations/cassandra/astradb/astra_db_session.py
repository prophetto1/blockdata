from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\astradb\AstraDbSession.java
# WARNING: Unresolved types: CqlSession

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AstraDbSession:
    keyspace: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    secure_bundle: Property[str] | None = None
    proxy_address: ProxyAddress | None = None

    def connect(self, run_context: RunContext) -> CqlSession:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ProxyAddress:
        hostname: str
        port: Property[int] = Property.ofValue(9042)

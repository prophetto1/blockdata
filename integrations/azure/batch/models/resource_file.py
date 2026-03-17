from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\ResourceFile.java
# WARNING: Unresolved types: azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from integrations.azure.batch.models.compute_node_identity_reference import ComputeNodeIdentityReference
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ResourceFile:
    auto_storage_container_name: Property[str] | None = None
    storage_container_url: Property[str] | None = None
    http_url: Property[str] | None = None
    blob_prefix: Property[str] | None = None
    file_path: Property[str] | None = None
    file_mode: Property[str] | None = None
    identity_reference: ComputeNodeIdentityReference | None = None

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.ResourceFile:
        raise NotImplementedError  # TODO: translate from Java

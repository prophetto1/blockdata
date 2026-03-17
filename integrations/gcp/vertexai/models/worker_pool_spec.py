from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\WorkerPoolSpec.java
# WARNING: Unresolved types: aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from typing import Any

from integrations.gcp.vertexai.models.container_spec import ContainerSpec
from integrations.gcp.vertexai.models.disc_spec import DiscSpec
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.gcp.vertexai.models.machine_spec import MachineSpec
from engine.core.models.property.property import Property
from integrations.gcp.vertexai.models.python_package_spec import PythonPackageSpec
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class WorkerPoolSpec:
    container_spec: ContainerSpec
    machine_spec: MachineSpec
    disc_spec: DiscSpec | None = None
    replica_count: Property[int] | None = None
    python_package_spec: PythonPackageSpec | None = None

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.WorkerPoolSpec:
        raise NotImplementedError  # TODO: translate from Java

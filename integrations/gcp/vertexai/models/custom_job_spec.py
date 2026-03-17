from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\CustomJobSpec.java
# WARNING: Unresolved types: aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from typing import Any

from integrations.gcp.vertexai.models.gcs_destination import GcsDestination
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.vertexai.models.scheduling import Scheduling
from integrations.gcp.vertexai.models.worker_pool_spec import WorkerPoolSpec


@dataclass(slots=True, kw_only=True)
class CustomJobSpec:
    worker_pool_specs: list[WorkerPoolSpec]
    service_account: Property[str] | None = None
    network: Property[str] | None = None
    tensorboard: Property[str] | None = None
    enable_web_access: Property[bool] | None = None
    scheduling: Scheduling | None = None
    base_output_directory: GcsDestination | None = None

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.CustomJobSpec:
        raise NotImplementedError  # TODO: translate from Java

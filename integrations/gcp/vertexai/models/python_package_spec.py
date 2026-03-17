from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\PythonPackageSpec.java
# WARNING: Unresolved types: aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PythonPackageSpec:
    package_uris: Property[list[str]]
    args: Property[list[str]]
    envs: Property[dict[str, str]]

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.PythonPackageSpec:
        raise NotImplementedError  # TODO: translate from Java

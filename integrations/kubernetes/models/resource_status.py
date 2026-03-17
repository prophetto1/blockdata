from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\ResourceStatus.java
# WARNING: Unresolved types: GenericKubernetesResource

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ResourceStatus:
    status: dict[str, Any] | None = None

    @staticmethod
    def from(resource: GenericKubernetesResource) -> ResourceStatus:
        raise NotImplementedError  # TODO: translate from Java

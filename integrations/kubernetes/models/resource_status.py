from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ResourceStatus:
    status: dict[String, Object] | None = None

    def from(self, resource: GenericKubernetesResource) -> ResourceStatus:
        raise NotImplementedError  # TODO: translate from Java

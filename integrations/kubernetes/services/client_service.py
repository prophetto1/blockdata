from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ClientService:

    def of(self) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, config: Config) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

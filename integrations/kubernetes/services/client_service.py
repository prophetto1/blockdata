from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\ClientService.java
# WARNING: Unresolved types: Config, KubernetesClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ClientService(ABC):

    @staticmethod
    def of() -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(config: Config) -> KubernetesClient:
        raise NotImplementedError  # TODO: translate from Java

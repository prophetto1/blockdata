from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\ResourceWaitService.java
# WARNING: Unresolved types: GenericKubernetesResource, KubernetesClient, Logger, ResourceDefinitionContext

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class ResourceWaitService(ABC):

    @staticmethod
    def wait_for_ready(client: KubernetesClient, resource_context: ResourceDefinitionContext, namespace: str, resource_name: str, timeout: timedelta, logger: Logger) -> GenericKubernetesResource:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_resource_ready(resource: GenericKubernetesResource, logger: Logger) -> bool:
        raise NotImplementedError  # TODO: translate from Java

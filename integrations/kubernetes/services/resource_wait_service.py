from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta


@dataclass(slots=True, kw_only=True)
class ResourceWaitService:

    def wait_for_ready(self, client: KubernetesClient, resource_context: ResourceDefinitionContext, namespace: str, resource_name: str, timeout: timedelta, logger: Logger) -> GenericKubernetesResource:
        raise NotImplementedError  # TODO: translate from Java

    def is_resource_ready(self, resource: GenericKubernetesResource, logger: Logger) -> bool:
        raise NotImplementedError  # TODO: translate from Java

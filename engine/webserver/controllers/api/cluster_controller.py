from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\ClusterController.java

from dataclasses import dataclass
from typing import Any

from engine.core.server.service_instance import ServiceInstance
from engine.core.repositories.service_instance_repository_interface import ServiceInstanceRepositoryInterface


@dataclass(slots=True, kw_only=True)
class ClusterController:
    repository: ServiceInstanceRepositoryInterface | None = None

    def get_service(self, id: str) -> HttpResponse[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

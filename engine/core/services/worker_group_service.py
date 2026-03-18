from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\WorkerGroupService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar, Optional

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.tasks.worker_group import WorkerGroup
from engine.core.runners.worker_job import WorkerJob


@dataclass(slots=True, kw_only=True)
class WorkerGroupService:
    logger: ClassVar[Logger] = getLogger(__name__)

    def resolve_group_from_key(self, worker_group_key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_group_from_job(self, flow: FlowInterface, worker_job: WorkerJob) -> Optional[WorkerGroup]:
        raise NotImplementedError  # TODO: translate from Java

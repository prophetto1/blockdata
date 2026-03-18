from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudquery\src\main\java\io\kestra\plugin\cloudquery\AbstractCloudQueryCommand.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.scripts.runner.docker.docker import Docker
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractCloudQueryCommand(ABC, Task):
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "ghcr.io/cloudquery/cloudquery:latest"
    task_runner: TaskRunner[Any] = Docker.builder()
        .type(Docker.class.getName())
        .entryPoint(Collections.emptyList())
        .build()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    env: Property[dict[str, str]] | None = None
    docker: DockerOptions | None = None

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

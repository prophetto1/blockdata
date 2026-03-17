from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractCloudQueryCommand(Task):
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    env: Property[dict[String, String]] | None = None
    docker: DockerOptions | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

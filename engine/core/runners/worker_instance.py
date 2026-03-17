from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerInstance.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class WorkerInstance:
    uid: str | None = None
    worker_uuid: str | None = None
    worker_group: str | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def worker_uuid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

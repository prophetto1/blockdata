from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServerInstance.java

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.core.server.metric import Metric


@dataclass(slots=True, kw_only=True)
class ServerInstance:
    i_n_s_t_a_n_c_e__i_d: ClassVar[str] = IdUtils.create()
    id: str | None = None
    type: Type | None = None
    version: str | None = None
    hostname: str | None = None
    props: dict[str, Any] | None = None
    metrics: set[Metric] | None = None

    class Type(str, Enum):
        SERVER = "SERVER"
        STANDALONE = "STANDALONE"

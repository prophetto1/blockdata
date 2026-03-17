from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\Scheduler.java

from typing import Any, Protocol

from engine.core.server.service import Service


class Scheduler(Service, Runnable, Protocol):
    pass

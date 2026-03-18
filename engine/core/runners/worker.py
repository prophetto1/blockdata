from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\Worker.java

from typing import Any, Protocol

from engine.core.server.service import Service


class Worker(Service, Runnable, Protocol):
    pass

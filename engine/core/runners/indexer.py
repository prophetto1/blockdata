from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\Indexer.java

from typing import Any, Protocol

from engine.core.server.service import Service


class Indexer(Service, Runnable, Protocol):
    pass

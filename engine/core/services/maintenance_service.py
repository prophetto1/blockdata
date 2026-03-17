from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\MaintenanceService.java

from typing import Any, Protocol

from engine.core.utils.disposable import Disposable


class MaintenanceService(Protocol):
    def is_in_maintenance_mode(self) -> bool: ...

    def listen(self, listener: MaintenanceListener) -> Disposable: ...

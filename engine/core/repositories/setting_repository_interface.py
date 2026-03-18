from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\SettingRepositoryInterface.java

from typing import Any, Optional, Protocol

from engine.core.models.setting import Setting


class SettingRepositoryInterface(Protocol):
    def find_by_key(self, key: str) -> Optional[Setting]: ...

    def find_all(self) -> list[Setting]: ...

    def save(self, setting: Setting) -> Setting: ...

    def internal_save(self, setting: Setting) -> Setting: ...

    def delete(self, setting: Setting) -> Setting: ...

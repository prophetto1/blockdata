from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\secret\SecretPluginInterface.java

from typing import Any, Protocol

from engine.core.models.annotations.plugin import Plugin


class SecretPluginInterface(Plugin, Protocol):
    pass

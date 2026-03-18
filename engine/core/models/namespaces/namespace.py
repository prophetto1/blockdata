from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\namespaces\Namespace.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.namespaces.namespace_interface import NamespaceInterface


@dataclass(slots=True, kw_only=True)
class Namespace:
    id: str

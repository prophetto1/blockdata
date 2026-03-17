from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\TaskFixture.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.asset import Asset
from engine.core.models.property.property import Property
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class TaskFixture:
    id: str
    state: State.Type = State.Type.SUCCESS
    value: str | None = None
    outputs: dict[str, Any] | None = None
    assets: list[Asset] | None = None
    description: Property[str] | None = None

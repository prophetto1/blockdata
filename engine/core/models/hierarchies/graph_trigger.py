from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\GraphTrigger.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph_trigger import AbstractGraphTrigger
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class GraphTrigger(AbstractGraphTrigger):
    pass

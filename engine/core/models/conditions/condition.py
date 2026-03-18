from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\conditions\Condition.java
# WARNING: Unresolved types: PredicateChecked

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.plugin import Plugin
from engine.core.utils.rethrow import Rethrow


@dataclass(slots=True, kw_only=True)
class Condition(ABC):
    type: str

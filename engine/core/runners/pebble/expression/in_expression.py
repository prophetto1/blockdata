from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\expression\InExpression.java
# WARNING: Unresolved types: BinaryExpression, EvaluationContextImpl, PebbleTemplateImpl

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.condition.expression import Expression


@dataclass(slots=True, kw_only=True)
class InExpression(BinaryExpression):

    def evaluate(self, self: PebbleTemplateImpl, context: EvaluationContextImpl) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\PropertyValueExtractor.java
# WARNING: Unresolved types: ValueExtractor, ValueReceiver

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PropertyValueExtractor:

    def extract_values(self, original_value: Property[Any], receiver: ValueReceiver) -> None:
        raise NotImplementedError  # TODO: translate from Java

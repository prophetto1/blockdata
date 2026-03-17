from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ion\IonGenerator.java
# WARNING: Unresolved types: IOContext, IonWriter, ObjectCodec, com, dataformat, fasterxml, ion, jackson

from dataclasses import dataclass
from datetime import date
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class IonGenerator(IonGenerator):

    def write_string(self, value: Any, serialized: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_date(self, value: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

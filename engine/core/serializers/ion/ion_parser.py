from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ion\IonParser.java
# WARNING: Unresolved types: IOContext, IOException, IonReader, IonType, JsonToken, com, dataformat, fasterxml, ion, jackson

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IonParser(IonParser):

    def _token_from_type(self, type: IonType) -> JsonToken:
        raise NotImplementedError  # TODO: translate from Java

    def get_embedded_object(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

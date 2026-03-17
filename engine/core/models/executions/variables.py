from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\Variables.java
# WARNING: Unresolved types: DeserializationContext, IOException, JsonGenerator, JsonParser, ObjectMapper, SerializerProvider, StdDeserializer, StdSerializer

from typing import Any, Protocol

from engine.core.utils.read_only_delegating_map import ReadOnlyDelegatingMap
from engine.core.models.flows.state import State
from engine.core.storages.storage import Storage


class Variables(Protocol):
    def empty() -> Variables: ...

    def in_memory(outputs: dict[str, Any]) -> Variables: ...

    def in_storage(storage: Storage, outputs: dict[str, Any]) -> Variables: ...

    def in_storage(storage_context: StorageContext, uri: str) -> Variables: ...

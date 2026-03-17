from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextModule.java
# WARNING: Unresolved types: DeserializationContext, IOException, JacksonException, JsonDeserializer, JsonParser, SimpleModule

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextModule(SimpleModule):
    serial_version_u_i_d: int = 1
    n_a_m_e: str = "kestra-context"

    @dataclass(slots=True)
    class RunContextDeserializer(JsonDeserializer):

        def deserialize(self, p: JsonParser, ctxt: DeserializationContext) -> RunContext:
            raise NotImplementedError  # TODO: translate from Java

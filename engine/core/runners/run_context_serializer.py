from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextSerializer.java
# WARNING: Unresolved types: IOException, JsonGenerator, SerializerProvider, StdSerializer

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextSerializer(StdSerializer):
    serial_version_u_i_d: ClassVar[int] = 1

    def serialize(self, value: RunContext, gen: JsonGenerator, provider: SerializerProvider) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RunContextData:
        variables: dict[str, Any] | None = None
        secret_inputs: list[str] | None = None
        trace_parent: str | None = None

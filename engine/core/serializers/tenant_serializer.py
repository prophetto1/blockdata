from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\TenantSerializer.java
# WARNING: Unresolved types: BeanDescription, BeanPropertyWriter, BeanSerializerModifier, SerializationConfig

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TenantSerializer(BeanSerializerModifier):
    serial_version_uid: ClassVar[int] = 1

    def change_properties(self, config: SerializationConfig, bean_desc: BeanDescription, bean_properties: list[BeanPropertyWriter]) -> list[BeanPropertyWriter]:
        raise NotImplementedError  # TODO: translate from Java

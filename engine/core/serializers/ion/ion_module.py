from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ion\IonModule.java
# WARNING: Unresolved types: SerializerProvider, SetupContext, SimpleModule, StdScalarSerializer

from dataclasses import dataclass, field
from datetime import date
from datetime import datetime
from typing import Any, Callable, ClassVar

from engine.core.utils.version import Version


@dataclass(slots=True, kw_only=True)
class IonModule(SimpleModule):
    version: ClassVar[Version]
    serial_version_uid: ClassVar[int] = 1

    def get_module_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def version(self) -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StringTypedSerializer(StdScalarSerializer):
        serial_version_uid: ClassVar[int] = 1
        mapper: Callable[T, str] | None = None

        def serialize(self, value: T, json_generator: JsonGenerator, serializer_provider: SerializerProvider) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class InstantSerializer(StdScalarSerializer):
        serial_version_uid: ClassVar[int] = 1

        def serialize(self, date: datetime, json_generator: JsonGenerator, serializer_provider: SerializerProvider) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LocalDateSerializer(StdScalarSerializer):
        serial_version_uid: ClassVar[int] = 1

        def serialize(self, date: date, json_generator: JsonGenerator, serializer_provider: SerializerProvider) -> None:
            raise NotImplementedError  # TODO: translate from Java

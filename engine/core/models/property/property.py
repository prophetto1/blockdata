from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\Property.java
# WARNING: Unresolved types: DeserializationContext, JavaType, JsonParser, SerializerProvider, StdDeserializer, StdSerializer

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property_context import PropertyContext
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Property:
    mapper: ClassVar[ObjectMapper]
    skip_cache: bool | None = None
    expression: str | None = None
    value: T | None = None

    def skip_cache(self) -> Property[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_value(value: V) -> Property[V]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(value: V) -> Property[V]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_expression(expression: str) -> Property[V]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as(property: Property[T], context: PropertyContext, clazz: type[T], variables: dict[str, Any] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deserialize(rendered: Any, clazz: type[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_list(property: Property[T], context: PropertyContext, item_clazz: type[I], variables: dict[str, Any] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_map(property: Property[T], run_context: RunContext, key_class: type[K], value_class: type[V], variables: dict[str, Any] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def hash_code(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PropertyDeserializer(StdDeserializer):
        serial_version_uid: ClassVar[int] = 1

        def deserialize(self, p: JsonParser, ctxt: DeserializationContext) -> Property[Any]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PropertySerializer(StdSerializer):
        serial_version_uid: ClassVar[int] = 1

        def serialize(self, value: Property, gen: JsonGenerator, provider: SerializerProvider) -> None:
            raise NotImplementedError  # TODO: translate from Java

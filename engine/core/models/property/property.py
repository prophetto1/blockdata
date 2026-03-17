from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\Property.java
# WARNING: Unresolved types: Class, DeserializationContext, I, IOException, JavaType, JsonGenerator, JsonParser, K, ObjectMapper, SerializerProvider, StdDeserializer, StdSerializer, T, V

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property_context import PropertyContext
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Property:
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
        .copy()
        .configure(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS, false)
    skip_cache: bool | None = None
    expression: str | None = None
    value: T | None = None

    def get_expression(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

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
    def as(property: Property[T], context: PropertyContext, clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as(property: Property[T], context: PropertyContext, clazz: Class[T], variables: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deserialize(rendered: Any, clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deserialize(rendered: Any, type: JavaType) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_list(property: Property[T], context: PropertyContext, item_clazz: Class[I]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_list(property: Property[T], context: PropertyContext, item_clazz: Class[I], variables: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_map(property: Property[T], run_context: RunContext, key_class: Class[K], value_class: Class[V]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_map(property: Property[T], run_context: RunContext, key_class: Class[K], value_class: Class[V], variables: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def hash_code(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_value(self) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PropertyDeserializer(StdDeserializer):
        serial_version_u_i_d: int = 1

        def deserialize(self, p: JsonParser, ctxt: DeserializationContext) -> Property[Any]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PropertySerializer(StdSerializer):
        serial_version_u_i_d: int = 1

        def serialize(self, value: Property, gen: JsonGenerator, provider: SerializerProvider) -> None:
            raise NotImplementedError  # TODO: translate from Java

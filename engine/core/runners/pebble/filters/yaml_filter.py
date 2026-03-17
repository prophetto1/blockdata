from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\YamlFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, GuavaModule, JavaTimeModule, Jdk8Module, ObjectMapper, ParameterNamesModule, PebbleException, PebbleTemplate, YAMLFactory

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class YamlFilter:
    m_a_p_p_e_r: ObjectMapper = new ObjectMapper(
        new YAMLFactory()
            .configure(YAMLGenerator.Feature.MINIMIZE_QUOTES, true)
            .configure(YAMLGenerator.Feature.WRITE_DOC_START_MARKER, false)
            .configure(YAMLGenerator.Feature.USE_NATIVE_TYPE_ID, false)
            .configure(YAMLGenerator.Feature.SPLIT_LINES, false)
            .configure(YAMLGenerator.Feature.INDENT_ARRAYS, true)
            .configure(YAMLGenerator.Feature.USE_PLATFORM_LINE_BREAKS, true)
            .configure(YAMLGenerator.Feature.ALWAYS_QUOTE_NUMBERS_AS_STRINGS, false)
        )
        .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
        .registerModule(new JavaTimeModule())
        .registerModule(new Jdk8Module())
        .registerModule(new ParameterNamesModule())
        .registerModules(new GuavaModule())

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

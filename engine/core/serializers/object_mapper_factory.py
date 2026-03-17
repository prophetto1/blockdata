from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ObjectMapperFactory.java
# WARNING: Unresolved types: JacksonConfiguration, JsonFactory, jackson, micronaut

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ObjectMapperFactory(ObjectMapperFactory):

    def object_mapper(self, jackson_configuration: JacksonConfiguration, json_factory: JsonFactory) -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\serdes\KafkaAvroSerializer.java
# WARNING: Unresolved types: confluent, io, kafka, serializers

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class KafkaAvroSerializer(KafkaAvroSerializer):

    def configure(self, configs: dict[str, Any], is_key: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

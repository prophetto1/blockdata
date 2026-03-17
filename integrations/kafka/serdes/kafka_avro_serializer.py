from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class KafkaAvroSerializer(io):

    def configure(self, configs: dict[String, Any], is_key: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

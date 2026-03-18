from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\Backfill.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer


@dataclass(slots=True, kw_only=True)
class Backfill:
    """A backfill configuration."""
    start: datetime
    paused: bool = False
    end: datetime | None = None
    current_date: datetime | None = None
    inputs: dict[str, Any] | None = None
    labels: list[@NoSystemLabelValidation Label] | None = None
    previous_next_execution_date: datetime | None = None

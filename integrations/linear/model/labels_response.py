from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linear\src\main\java\io\kestra\plugin\linear\model\LabelsResponse.java
# WARNING: Unresolved types: LinearNode

from dataclasses import dataclass
from typing import Any

from integrations.linear.model.linear_data import LinearData


@dataclass(slots=True, kw_only=True)
class LabelsResponse:
    data: LabelsData | None = None
    errors: list[Any] | None = None

    def get_labels(self) -> list[LinearData.LinearNode]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LabelsData:
        labels: LinearData | None = None

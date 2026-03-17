from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.linear.model.linear_data import LinearData


@dataclass(slots=True, kw_only=True)
class LabelsResponse:
    data: LabelsData | None = None
    errors: list[Object] | None = None

    def get_labels(self) -> list[LinearData]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LabelsData:
        labels: LinearData | None = None


@dataclass(slots=True, kw_only=True)
class LabelsData:
    labels: LinearData | None = None

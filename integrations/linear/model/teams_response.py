from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.linear.model.linear_data import LinearData


@dataclass(slots=True, kw_only=True)
class TeamsResponse:
    data: TeamsData | None = None
    errors: list[Object] | None = None

    def get_teams(self) -> list[LinearData]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TeamsData:
        teams: LinearData | None = None


@dataclass(slots=True, kw_only=True)
class TeamsData:
    teams: LinearData | None = None

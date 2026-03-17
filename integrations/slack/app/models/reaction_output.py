from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\ReactionOutput.java
# WARNING: Unresolved types: Reaction, api, com, core, io, kestra, model, models, slack, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class ReactionOutput:
    name: str | None = None
    count: int | None = None
    users: list[str] | None = None
    url: str | None = None

    @staticmethod
    def of(reaction: com.slack.api.model.Reaction) -> ReactionOutput:
        raise NotImplementedError  # TODO: translate from Java

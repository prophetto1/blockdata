from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Edit(AbstractSlackClientConnection, RunnableTask):
    """Apply changes to a canvas"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    canvas_id: Property[str]
    changes: Property[list[Map[String, Object]]]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

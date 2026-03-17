from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.canvas_section_output import CanvasSectionOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SectionsLookup(AbstractSlackClientConnection, RunnableTask):
    """Find sections within a canvas"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    canvas_id: Property[str]
    criteria: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> CanvasSectionOutput:
        raise NotImplementedError  # TODO: translate from Java

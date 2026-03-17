from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.canvas_output import CanvasOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractSlackClientConnection, RunnableTask):
    """Create a Slack canvas"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    title: Property[str]
    document_content: Property[dict[String, String]]

    def run(self, run_context: RunContext) -> CanvasOutput:
        raise NotImplementedError  # TODO: translate from Java

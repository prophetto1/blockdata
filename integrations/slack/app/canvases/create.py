from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\canvases\Create.java
# WARNING: Unresolved types: Exception, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.canvas_output import CanvasOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractSlackClientConnection):
    """Create a Slack canvas"""
    title: Property[str]
    document_content: Property[dict[str, str]]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    def run(self, run_context: RunContext) -> CanvasOutput:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


class ParseMode(str, Enum):
    HTML = "HTML"
    MARKDOWNV2 = "MARKDOWNV2"


@dataclass(slots=True, kw_only=True)
class TelegramSend(AbstractHttpOptionsTask):
    """Send an automated Telegram message from a workflow."""
    t_e_l_e_g_r_a_m_a_p_i__b_a_s_e__u_r_l: str | None = None
    token: Property[str]
    channel: Property[str]
    payload: Property[str] | None = None
    parse_mode: Property[ParseMode] | None = None
    endpoint_override: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

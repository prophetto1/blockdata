from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-telegram\src\main\java\io\kestra\plugin\telegram\TelegramSend.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.telegram.abstract_telegram_connection import AbstractTelegramConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TelegramSend(AbstractTelegramConnection):
    """Send a Telegram chat message"""
    token: Property[str]
    channel: Property[str]
    t_e_l_e_g_r_a_m_a_p_i__b_a_s_e__u_r_l: ClassVar[str] = "https://api.telegram.org"
    payload: Property[str] | None = None
    parse_mode: Property[ParseMode] | None = None
    endpoint_override: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    class ParseMode(str, Enum):
        HTML = "HTML"
        MARKDOWNV2 = "MARKDOWNV2"

from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcScheduler.java
# WARNING: Unresolved types: ApplicationContext, BiConsumer

from dataclasses import dataclass, field
from logging import logging
from datetime import datetime
from typing import Any, ClassVar

from engine.scheduler.abstract_scheduler import AbstractScheduler
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.core.runners.schedule_context_interface import ScheduleContextInterface
from engine.core.models.triggers.trigger import Trigger
from engine.core.repositories.trigger_repository_interface import TriggerRepositoryInterface


@dataclass(slots=True, kw_only=True)
class JdbcScheduler(AbstractScheduler):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    trigger_repository: TriggerRepositoryInterface | None = None
    dsl_context_wrapper: JooqDSLContextWrapper | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_next(self, flows: list[FlowWithSource], now: datetime, consumer: BiConsumer[list[Trigger], ScheduleContextInterface]) -> None:
        raise NotImplementedError  # TODO: translate from Java

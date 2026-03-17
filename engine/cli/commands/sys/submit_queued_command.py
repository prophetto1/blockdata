from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\sys\SubmitQueuedCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.core.models.executions.execution import Execution
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class SubmitQueuedCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    application_context: ApplicationContext | None = None
    execution_queue: QueueInterface[Execution] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

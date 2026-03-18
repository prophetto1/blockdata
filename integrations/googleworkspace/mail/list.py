from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\List.java
# WARNING: Unresolved types: Exception, IOException, core, googleworkspace, io, java, kestra, mail, models, plugin, tasks, util

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.googleworkspace.mail.abstract_mail import AbstractMail
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractMail):
    """List Gmail messages"""
    max_results: Property[int] = Property.ofValue(100)
    include_spam_trash: Property[bool] = Property.ofValue(false)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    query: Property[str] | None = None
    label_ids: Property[java.util.List[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_messages(self, run_context: RunContext, messages: java.util.List[io.kestra.plugin.googleworkspace.mail.models.Message]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages: java.util.List[io.kestra.plugin.googleworkspace.mail.models.Message] | None = None
        message: io.kestra.plugin.googleworkspace.mail.models.Message | None = None
        uri: str | None = None
        result_size_estimate: int | None = None
        next_page_token: str | None = None

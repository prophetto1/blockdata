from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\mail\RealTimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, CountDownLatch, EmailData, Exception, Flux, Folder, IMAPFolder, MailConfiguration, Publisher, Store

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.email.abstract_mail_trigger import AbstractMailTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.email.mail_service import MailService
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealTimeTrigger(AbstractMailTrigger):
    """Trigger a flow when an email is received in real-time."""
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    active_store: AtomicReference[Store] = new AtomicReference<>()
    active_folder: AtomicReference[Folder] = new AtomicReference<>()
    last_fetched: AtomicReference[datetime] = new AtomicReference<>()

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def create_realtime_email_stream(self, run_context: RunContext, config: MailConfiguration) -> Flux[EmailData]:
        raise NotImplementedError  # TODO: translate from Java

    def create_imap_idle_stream(self, run_context: RunContext, config: MailConfiguration) -> Flux[EmailData]:
        raise NotImplementedError  # TODO: translate from Java

    def cleanup_imap_resources(self, run_context: RunContext, store: Store, folder: IMAPFolder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_pop3_polling_stream(self, run_context: RunContext, config: MailConfiguration) -> Flux[EmailData]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

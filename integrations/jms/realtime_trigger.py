from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig
from engine.core.models.executions.execution import Execution
from integrations.jms.j_m_s_destination import JMSDestination
from integrations.jms.j_m_s_message import JMSMessage
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, RealtimeTriggerInterface, TriggerOutput):
    """Start a flow on JMS messages"""
    connection_factory_config: ConnectionFactoryConfig
    destination: JMSDestination
    message_selector: str | None = None
    serde_type: Property[SerdeType] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class JmsListener:
        run_context: io | None = None
        connection_factory_config: ConnectionFactoryConfig | None = None
        destination: JMSDestination | None = None
        message_selector: str | None = None
        serde_type: SerdeType | None = None
        message_consumer: java | None = None
        error_consumer: java | None = None
        connection: ConnectionAdapter | None = None

        def start(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class JmsListener:
    run_context: io | None = None
    connection_factory_config: ConnectionFactoryConfig | None = None
    destination: JMSDestination | None = None
    message_selector: str | None = None
    serde_type: SerdeType | None = None
    message_consumer: java | None = None
    error_consumer: java | None = None
    connection: ConnectionAdapter | None = None

    def start(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\RealtimeTrigger.java
# WARNING: Unresolved types: ConnectionAdapter, Consumer, Exception, Publisher, Throwable, core, function, io, java, kestra, runners, util

from dataclasses import dataclass
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig
from engine.core.models.executions.execution import Execution
from integrations.jms.j_m_s_destination import JMSDestination
from integrations.jms.j_m_s_message import JMSMessage
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Start a flow on JMS messages"""
    connection_factory_config: ConnectionFactoryConfig
    destination: JMSDestination
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    message_selector: str | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class JmsListener:
        run_context: io.kestra.core.runners.RunContext | None = None
        connection_factory_config: ConnectionFactoryConfig | None = None
        destination: JMSDestination | None = None
        message_selector: str | None = None
        serde_type: SerdeType | None = None
        message_consumer: java.util.function.Consumer[JMSMessage] | None = None
        error_consumer: java.util.function.Consumer[Throwable] | None = None
        connection: ConnectionAdapter | None = None

        def start(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

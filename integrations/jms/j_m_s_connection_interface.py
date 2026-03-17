from __future__ import annotations

from typing import Any, Protocol

from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig


class JMSConnectionInterface(Protocol):
    def get_connection_factory_config(self) -> ConnectionFactoryConfig: ...
    def get_username(self) -> str: ...
    def get_password(self) -> str: ...

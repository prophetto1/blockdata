from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\configuration\ConnectionFactoryConfig.java
# WARNING: Unresolved types: B, C, DirectBuilder, DirectBuilderImpl, JndiBuilder, JndiBuilderImpl

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class ConnectionFactoryConfig(ABC):
    use_filtered_class_loader: Property[bool] = Property.ofValue(false)
    provider_jar_paths: list[str] | None = None
    username: str | None = None
    password: str | None = None
    connection_properties: dict[str, str] | None = None

    @dataclass(slots=True)
    class ConnectionFactoryConfigBuilder(ABC):
        pass

    @dataclass(slots=True)
    class Direct(ConnectionFactoryConfig):
        connection_factory_class: Property[str]

        @dataclass(slots=True)
        class DirectBuilder(ABC, ConnectionFactoryConfigBuilder):
            pass

        @dataclass(slots=True)
        class DirectBuilderImpl(DirectBuilder):
            pass

    @dataclass(slots=True)
    class Jndi(ConnectionFactoryConfig):
        jndi_initial_context_factory: Property[str]
        jndi_provider_url: Property[str]
        jndi_connection_factory_name: Property[str]
        jndi_principal: Property[str] | None = None
        jndi_credentials: Property[str] | None = None

        @dataclass(slots=True)
        class JndiBuilder(ABC, ConnectionFactoryConfigBuilder):
            pass

        @dataclass(slots=True)
        class JndiBuilderImpl(JndiBuilder):
            pass

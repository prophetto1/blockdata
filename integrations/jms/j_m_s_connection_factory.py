from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\JMSConnectionFactory.java
# WARNING: Unresolved types: ConnectionFactoryAdapter, Direct, Exception, IOException, JmsFactory, Jndi

from dataclasses import dataclass
from typing import Any

from integrations.jms.configuration.connection_factory_config import ConnectionFactoryConfig
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class JMSConnectionFactory:

    def create(self, run_context: RunContext, config: ConnectionFactoryConfig) -> ConnectionFactoryAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_provider_jar_urls(self, run_context: RunContext, provider_jar_paths: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def create_direct_connection_factory(self, run_context: RunContext, config: ConnectionFactoryConfig.Direct, jms_factory: JmsFactory) -> ConnectionFactoryAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def create_jndi_connection_factory(self, run_context: RunContext, config: ConnectionFactoryConfig.Jndi, jms_factory: JmsFactory) -> ConnectionFactoryAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def get_nested_jar_urls(self, subfolder_path: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_from_filesystem_folder(self, plugin_url: str, subfolder_path: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

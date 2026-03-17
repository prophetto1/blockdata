from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from integrations.redis.redis_connection_interface import RedisConnectionInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractRedisConnection(Task, RedisConnectionInterface):
    url: Property[str] | None = None

    def redis_factory(self, run_context: RunContext) -> RedisFactory:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RedisFactory(AutoCloseable):
        redis_client: RedisClient | None = None
        redis_connection: StatefulRedisConnection[String, String] | None = None
        sync_commands: RedisCommands[String, String] | None = None

        def connect(self, run_context: RunContext) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class RedisFactory(AutoCloseable):
    redis_client: RedisClient | None = None
    redis_connection: StatefulRedisConnection[String, String] | None = None
    sync_commands: RedisCommands[String, String] | None = None

    def connect(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

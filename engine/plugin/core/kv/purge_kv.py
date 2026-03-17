from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\PurgeKV.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.storages.kv.kv_entry import KVEntry
from engine.plugin.core.kv.kv_purge_behavior import KvPurgeBehavior
from engine.core.models.property.property import Property
from engine.plugin.core.purge.purge_task import PurgeTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class PurgeKV(Task):
    """Purge keys from the KV store."""
    behavior: Property[KvPurgeBehavior]
    include_child_namespaces: Property[bool]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    key_pattern: Property[str] | None = None
    namespaces: Property[list[str]] | None = None
    namespace_pattern: Property[str] | None = None
    expired_only: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter_pattern(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def filter_target_extractor(self, item: KVEntry) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None

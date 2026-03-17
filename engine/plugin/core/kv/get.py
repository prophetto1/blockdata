from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\Get.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.storages.kv.kv_value import KVValue
from engine.core.models.property.property import Property
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Get(Task):
    """Read a key-value entry."""
    key: Property[str]
    namespace: Property[str]
    error_on_missing: Property[bool]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_value_with_inheritance(self, run_context: RunContext, flow_namespace: str, rendered_key: str) -> Optional[KVValue]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        value: Any | None = None

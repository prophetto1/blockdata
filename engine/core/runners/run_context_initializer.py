from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextInitializer.java

from dataclasses import dataclass
from typing import Any, Callable, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.runners.default_run_context import DefaultRunContext
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.core.plugins.plugin_configurations import PluginConfigurations
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_cache import RunContextCache
from engine.core.runners.run_context_logger_factory import RunContextLoggerFactory
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.runners.worker_task import WorkerTask
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class RunContextInitializer:
    application_context: ApplicationContext | None = None
    plugin_configurations: PluginConfigurations | None = None
    context_logger_factory: RunContextLoggerFactory | None = None
    storage_interface: StorageInterface | None = None
    namespace_factory: NamespaceFactory | None = None
    namespace_service: NamespaceService | None = None
    secret_key: Optional[str] | None = None
    run_context_cache: RunContextCache | None = None

    def for_executor(self, run_context: DefaultRunContext) -> DefaultRunContext:
        raise NotImplementedError  # TODO: translate from Java

    def for_worker(self, run_context: DefaultRunContext, worker_task: WorkerTask, variables_modifier: Callable[dict[str, Any], dict[str, Any]] | None = None) -> DefaultRunContext:
        raise NotImplementedError  # TODO: translate from Java

    def for_working_directory(self, run_context: DefaultRunContext, worker_task: WorkerTask) -> DefaultRunContext:
        raise NotImplementedError  # TODO: translate from Java

    def rehydrate_outputs(self, outputs: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def for_scheduler(self, run_context: DefaultRunContext, trigger_context: TriggerContext, trigger: AbstractTrigger) -> DefaultRunContext:
        raise NotImplementedError  # TODO: translate from Java

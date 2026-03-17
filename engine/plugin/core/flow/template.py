from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\Template.java
# WARNING: Unresolved types: ApplicationContext, StartupEvent, TriFunction, core, io, kestra, models, tasks, templates

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.repositories.template_repository_interface import TemplateRepositoryInterface


@dataclass(slots=True, kw_only=True)
class Template(Task):
    """Insert a reusable flow template (deprecated)."""
    namespace: str
    template_id: str
    errors: list[Task] | None = None
    _finally: list[Task] | None = None
    tenant_id: str | None = None
    args: dict[str, str] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def tasks_tree(self, execution: Execution, task_run: TaskRun, parent_values: list[str]) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    def all_child_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def child_tasks(self, run_context: RunContext, parent_task_run: TaskRun) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, run_context: RunContext) -> Template.Output:
        raise NotImplementedError  # TODO: translate from Java

    def find_template(self, application_context: ApplicationContext) -> io.kestra.core.models.templates.Template:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def inject_template(flow: Flow, execution: Execution, provider: TriFunction[str, str, str, io.kestra.core.models.templates.Template]) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutorTemplate(Template):
        template: io.kestra.core.models.templates.Template | None = None

        def find_template(self, application_context: ApplicationContext) -> io.kestra.core.models.templates.Template:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def of(template_task: Template, template: io.kestra.core.models.templates.Template) -> ExecutorTemplate:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ContextHelper:
        application_context: ApplicationContext | None = None
        context: ApplicationContext | None = None

        @staticmethod
        def context() -> ApplicationContext:
            raise NotImplementedError  # TODO: translate from Java

        def on_startup(self, event: StartupEvent) -> None:
            raise NotImplementedError  # TODO: translate from Java

    class TemplateExecutorInterface(Protocol):
        def find_by_id(self, tenant_id: str, namespace: str, template_id: str) -> Optional[io.kestra.core.models.templates.Template]: ...

    @dataclass(slots=True)
    class MemoryTemplateExecutor:
        template_repository: TemplateRepositoryInterface | None = None

        def find_by_id(self, tenant_id: str, namespace: str, template_id: str) -> Optional[io.kestra.core.models.templates.Template]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        args: dict[str, Any] | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\Push.java
# WARNING: Unresolved types: Exception, PersonIdent, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Push(AbstractCloningTask):
    """Deprecated: push mixed files to Git"""
    branch: Property[str]
    commit_message: Property[str]
    flows: FlowFiles = FlowFiles.builder().build()
    add_files_pattern: Property[list[str]] = Property.ofValue(List.of("."))
    directory: Property[str] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    author: Author | None = None

    def branch_exists(self, run_context: RunContext, branch: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def author(self, run_context: RunContext) -> PersonIdent:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        commit_id: str | None = None

    @dataclass(slots=True)
    class FlowFiles:
        enabled: Property[bool] = Property.ofValue(true)
        child_namespaces: Property[bool] = Property.ofValue(true)
        git_directory: Property[str] = Property.ofValue("_flows")

    @dataclass(slots=True)
    class Author:
        name: Property[str] | None = None
        email: Property[str] | None = None

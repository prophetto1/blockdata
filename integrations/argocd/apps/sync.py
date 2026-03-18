from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-argocd\src\main\java\io\kestra\plugin\argocd\apps\Sync.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.argocd.apps.abstract_argo_c_d import AbstractArgoCD
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractArgoCD):
    """Synchronize an ArgoCD application"""
    prune: Property[bool] = Property.ofValue(false)
    dry_run: Property[bool] = Property.ofValue(false)
    force: Property[bool] = Property.ofValue(false)
    revision: Property[str] | None = None
    timeout: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ScriptOutput):
        sync_status: str | None = None
        health_status: str | None = None
        revision: str | None = None
        resources: list[dict[str, Any]] | None = None
        raw_output: str | None = None

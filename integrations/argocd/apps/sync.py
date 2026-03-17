from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.argocd.apps.abstract_argo_c_d import AbstractArgoCD
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractArgoCD, RunnableTask):
    """Synchronize an ArgoCD application"""
    revision: Property[str] | None = None
    prune: Property[bool] | None = None
    dry_run: Property[bool] | None = None
    force: Property[bool] | None = None
    timeout: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ScriptOutput):
        sync_status: str | None = None
        health_status: str | None = None
        revision: str | None = None
        resources: list[Map[String, Object]] | None = None
        raw_output: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(ScriptOutput):
    sync_status: str | None = None
    health_status: str | None = None
    revision: str | None = None
    resources: list[Map[String, Object]] | None = None
    raw_output: str | None = None

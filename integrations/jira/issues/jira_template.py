from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jira.issues.jira_client import JiraClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class JiraTemplate(JiraClient):
    template_uri: Property[str] | None = None
    project_key: str | None = None
    summary: Property[str] | None = None
    description: str | None = None
    labels: Property[list[String]] | None = None
    issue_type_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

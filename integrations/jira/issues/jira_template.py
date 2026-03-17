from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jira\src\main\java\io\kestra\plugin\jira\issues\JiraTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.jira.issues.jira_client import JiraClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class JiraTemplate(ABC, JiraClient):
    project_key: str
    template_uri: Property[str] | None = None
    summary: Property[str] | None = None
    description: str | None = None
    labels: Property[list[str]] | None = None
    issue_type_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

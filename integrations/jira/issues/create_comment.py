from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jira\src\main\java\io\kestra\plugin\jira\issues\CreateComment.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.jira.issues.jira_template import JiraTemplate
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class CreateComment(JiraTemplate):
    """Add a comment to a Jira issue"""
    issue_id_or_key: str
    body: str

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

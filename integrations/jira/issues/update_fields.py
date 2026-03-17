from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jira.issues.jira_template import JiraTemplate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class UpdateFields(JiraTemplate):
    """Update fields on a Jira issue"""
    mapper: ObjectMapper | None = None
    issue_id_or_key: str | None = None
    fields: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

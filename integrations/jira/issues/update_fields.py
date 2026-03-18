from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jira\src\main\java\io\kestra\plugin\jira\issues\UpdateFields.java
# WARNING: Unresolved types: Exception, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.jira.issues.jira_template import JiraTemplate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class UpdateFields(JiraTemplate):
    """Update fields on a Jira issue"""
    issue_id_or_key: str
    fields: Property[dict[str, Any]]
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

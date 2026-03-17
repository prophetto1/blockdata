from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linear\src\main\java\io\kestra\plugin\linear\model\IssueResponse.java
# WARNING: Unresolved types: IssueCreate, LinearNode

from dataclasses import dataclass
from typing import Any

from integrations.linear.model.linear_data import LinearData


@dataclass(slots=True, kw_only=True)
class IssueResponse:
    data: IssueData | None = None
    errors: list[Any] | None = None

    def is_success(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_issue_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class IssueData:
        issue_create: IssueCreate | None = None

        @dataclass(slots=True)
        class IssueCreate:
            success: bool | None = None
            issue: LinearData.LinearNode | None = None

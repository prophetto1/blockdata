from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\RunResponse.java

from dataclasses import dataclass
from typing import Any

from integrations.apify.actor.run import Run
from integrations.argocd.apps.status import Status


@dataclass(slots=True, kw_only=True)
class RunResponse:
    data: Run | None = None
    status: Status | None = None

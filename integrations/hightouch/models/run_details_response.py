from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\RunDetailsResponse.java

from dataclasses import dataclass
from typing import Any

from integrations.hightouch.models.run_details import RunDetails


@dataclass(slots=True, kw_only=True)
class RunDetailsResponse:
    data: list[RunDetails] | None = None
    has_more: bool | None = None

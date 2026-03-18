from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\models\ScanResult.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.soda.models.check import Check
from integrations.singer.models.metric import Metric


@dataclass(slots=True, kw_only=True)
class ScanResult:
    definition_name: str | None = None
    default_data_source: str | None = None
    data_timestamp: datetime | None = None
    scan_start_timestamp: datetime | None = None
    scan_end_timestamp: datetime | None = None
    has_errors: bool | None = None
    has_warnings: bool | None = None
    has_failures: bool | None = None
    metrics: list[Metric] | None = None
    checks: list[Check] | None = None
    automated_monitoring_checks: list[str] | None = None
    profiling: list[str] | None = None
    metadata: list[str] | None = None

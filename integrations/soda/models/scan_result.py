from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.flows.check.check import Check
from engine.core.models.annotations.metric import Metric


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
    automated_monitoring_checks: list[String] | None = None
    profiling: list[String] | None = None
    metadata: list[String] | None = None

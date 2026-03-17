from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractJob.java
# WARNING: Unresolved types: CreateDisposition, WriteDisposition

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.abstract_job_interface import AbstractJobInterface
from integrations.airbyte.models.job_info import JobInfo
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractJob(ABC, AbstractBigquery):
    dry_run: Property[bool] = Property.ofValue(false)
    destination_table: Property[str] | None = None
    write_disposition: Property[JobInfo.WriteDisposition] | None = None
    create_disposition: Property[JobInfo.CreateDisposition] | None = None
    job_timeout: Property[timedelta] | None = None
    labels: Property[dict[str, str]] | None = None

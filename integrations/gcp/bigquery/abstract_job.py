from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.abstract_job_interface import AbstractJobInterface
from integrations.jenkins.job_info import JobInfo
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractJob(AbstractBigquery, AbstractJobInterface):
    destination_table: Property[str] | None = None
    write_disposition: Property[JobInfo] | None = None
    create_disposition: Property[JobInfo] | None = None
    job_timeout: Property[timedelta] | None = None
    labels: Property[dict[String, String]] | None = None
    dry_run: Property[bool] | None = None

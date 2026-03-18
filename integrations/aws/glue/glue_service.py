from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\glue\GlueService.java
# WARNING: Unresolved types: GetJobRunRequest

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class GlueService:

    @staticmethod
    def create_get_job_run_request(job_name: str, run_id: str) -> GetJobRunRequest:
        raise NotImplementedError  # TODO: translate from Java

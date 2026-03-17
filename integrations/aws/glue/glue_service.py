from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class GlueService:

    def create_get_job_run_request(self, job_name: str, run_id: str) -> GetJobRunRequest:
        raise NotImplementedError  # TODO: translate from Java

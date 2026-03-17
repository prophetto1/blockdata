from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteBucket(AbstractGcs, RunnableTask):
    """Delete a GCS bucket"""
    name: Property[str]
    force: Property[bool] | None = None
    c_o_n_c_u_r_r_e_n_t__d_e_l_e_t_i_o_n_s: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None
        bucket_uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
    bucket_uri: str | None = None

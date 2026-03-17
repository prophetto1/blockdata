from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractDataLakeWithFile, RunnableTask):
    """Upload a file to Azure Data Lake Storage"""
    a_z_u_r_e__l_e_a_s_e__m_i_n__d_u_r_a_t_i_o_n: int | None = None
    a_z_u_r_e__l_e_a_s_e__m_a_x__d_u_r_a_t_i_o_n: int | None = None
    from: Property[str]
    use_lease: Property[bool] | None = None
    lease_duration_seconds: Property[int] | None = None

    def run(self, run_context: RunContext) -> Upload:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file: AdlsFile | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file: AdlsFile | None = None

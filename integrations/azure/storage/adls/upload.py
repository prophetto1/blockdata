from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\Upload.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractDataLakeWithFile):
    """Upload a file to Azure Data Lake Storage"""
    from: Property[str]
    a_z_u_r_e__l_e_a_s_e__m_i_n__d_u_r_a_t_i_o_n: ClassVar[int] = 15
    a_z_u_r_e__l_e_a_s_e__m_a_x__d_u_r_a_t_i_o_n: ClassVar[int] = 60
    use_lease: Property[bool] | None = None
    lease_duration_seconds: Property[int] | None = None

    def run(self, run_context: RunContext) -> Upload.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: AdlsFile | None = None

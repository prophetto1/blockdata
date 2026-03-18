from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\Compose.java
# WARNING: Unresolved types: Exception, Filter, ListingType, core, gcp, gcs, io, kestra, models, plugin, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Compose(AbstractGcs):
    """Compose multiple GCS objects into one"""
    list: list
    g_c_s__c_o_m_p_o_s_e__m_a_x__s_o_u_r_c_e__o_b_j_e_c_t_s: ClassVar[int] = 32
    allow_empty: Property[bool] = Property.ofValue(false)
    to: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

    @dataclass(slots=True)
    class List:
        from: Property[str]
        filter: Property[io.kestra.plugin.gcp.gcs.List.Filter] = Property.ofValue(Filter.BOTH)
        listing_type: Property[io.kestra.plugin.gcp.gcs.List.ListingType] = Property.ofValue(ListingType.DIRECTORY)
        reg_exp: Property[str] | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\posts\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class List(AbstractFacebookTask):
    """List Facebook Page posts"""
    m_a_x__f_e_t_c_h__l_i_m_i_t: ClassVar[int] = 100
    limit: Property[int] = Property.ofValue(MAX_FETCH_LIMIT)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    fields: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: java.util.List[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None

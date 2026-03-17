from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-klaviyo\src\main\java\io\kestra\plugin\klaviyo\AbstractKlaviyoTask.java
# WARNING: Unresolved types: IOException, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractKlaviyoTask(ABC, Task):
    api_key: Property[str]
    a_p_i__v_e_r_s_i_o_n: ClassVar[str] = "2025-10-15"
    base_url: Property[str] = Property.ofValue("https://a.klaviyo.com/api")
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)

    def get_api_version(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def apply_fetch_strategy(self, r_fetch_type: FetchType, data: list[dict[str, Any]], run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def induce_delay(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        row: dict[str, Any] | None = None
        rows: list[dict[str, Any]] | None = None
        uri: str | None = None

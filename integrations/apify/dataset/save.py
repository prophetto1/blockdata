from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.dataset.abstract_get_dataset import AbstractGetDataset
from integrations.apify.data_set_format import DataSetFormat
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Save(AbstractGetDataset, RunnableTask):
    """Save Apify dataset to temp file"""
    log: Logger | None = None
    format: Property[DataSetFormat] | None = None
    delimiter: Property[str] | None = None
    bom: Property[bool] | None = None
    xml_root: Property[str] | None = None
    xml_row: Property[str] | None = None
    skip_header_row: Property[bool] | None = None
    e_m_p_t_y__d_a_t_a_s_e_t__b_y_t_e_s: byte | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_u_r_l(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_empty_dataset(self, run_context: RunContext) -> Predicate[URI]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        path: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    path: str | None = None

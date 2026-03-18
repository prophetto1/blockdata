from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\dataset\Save.java
# WARNING: Unresolved types: Exception, Logger, Predicate, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.apify.dataset.abstract_get_dataset import AbstractGetDataset
from integrations.apify.data_set_format import DataSetFormat
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Save(AbstractGetDataset):
    """Save Apify dataset to temp file"""
    log: ClassVar[Logger] = LoggerFactory.getLogger(Save.class)
    format: Property[DataSetFormat] = Property.ofValue(DataSetFormat.JSON)
    delimiter: Property[str] = Property.ofValue(",")
    xml_root: Property[str] = Property.ofValue("items")
    xml_row: Property[str] = Property.ofValue("item")
    skip_header_row: Property[bool] = Property.ofValue(false)
    e_m_p_t_y__d_a_t_a_s_e_t__b_y_t_e_s: ClassVar[list[int]] = "[]".getBytes()
    bom: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_u_r_l(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_empty_dataset(run_context: RunContext) -> Predicate[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        path: str | None = None

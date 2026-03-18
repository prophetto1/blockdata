from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\yaml\YamlToIon.java
# WARNING: Unresolved types: Exception, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class YamlToIon(Task):
    """Convert a YAML file into ION."""
    from: Property[str]
    y_a_m_l__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

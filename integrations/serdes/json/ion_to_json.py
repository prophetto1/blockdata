from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\json\IonToJson.java
# WARNING: Unresolved types: Exception, IOException, IonStruct, IonValue, JsonGenerator, ObjectMapper, ZoneId, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class IonToJson(Task):
    """Convert an ION file into a JSONL file."""
    from: Property[str]
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    new_line: Property[bool] = Property.ofValue(true)
    time_zone_id: Property[str] = Property.ofValue(ZoneId.systemDefault().toString())
    should_keep_annotations: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_ion_value_with_annotations(self, mapper: ObjectMapper, json_generator: JsonGenerator, value: IonValue, zone_id: ZoneId, parent_field_name: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def read_ion_struct_as_map(self, struct: IonStruct) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

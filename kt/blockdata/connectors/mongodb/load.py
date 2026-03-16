from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Iterable, TextIO

from bson import ObjectId

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_load import AbstractLoad
from blockdata.connectors.mongodb.write_models import InsertOneModel, WriteModel


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    id_key: Property[str] | None = None
    remove_id_key: Property[bool] = field(default_factory=lambda: Property.of_value(True))

    def source(self, run_context: RunContext, input_stream: TextIO) -> Iterable[WriteModel]:
        rendered_id_key = None
        if self.id_key is not None:
            rendered_id_key = run_context.render(self.id_key).as_type(str).or_else(None)
        remove_id_key = run_context.render(self.remove_id_key).as_type(bool).or_else(True)

        for row in input_stream:
            row = row.strip()
            if not row:
                continue

            values = json.loads(row)
            if rendered_id_key and rendered_id_key in values:
                values["_id"] = ObjectId(str(values[rendered_id_key]))
                if remove_id_key:
                    values.pop(rendered_id_key, None)

            yield InsertOneModel(document=values)

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\Upload.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractGcs):
    """Upload a file to GCS"""
    from: Property[str] | None = None
    to: Property[str] | None = None
    content_type: Property[str] | None = None
    content_encoding: Property[str] | None = None
    content_disposition: Property[str] | None = None
    cache_control: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\kubectl\Get.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.abstract_pod import AbstractPod
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.kubernetes.models.metadata import Metadata
from engine.core.models.property.property import Property
from integrations.kubernetes.models.resource_status import ResourceStatus
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractPod):
    """Fetch Kubernetes resources with optional storage"""
    resource_type: Property[str]
    fetch_type: Property[FetchType] = Property.ofValue(NONE)
    resources_names: Property[list[str]] | None = None
    api_group: Property[str] | None = None
    api_version: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_result(self, metadata_list: list[Metadata], status_list: list[ResourceStatus], run_context: RunContext) -> Map.Entry[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ResourceInfo:
        metadata: Metadata | None = None
        status: ResourceStatus | None = None

    @dataclass(slots=True)
    class Output:
        metadata_items: list[Metadata] | None = None
        metadata_item: Metadata | None = None
        status_items: list[ResourceStatus] | None = None
        status_item: ResourceStatus | None = None
        uri: str | None = None
        size: int | None = None

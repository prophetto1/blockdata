from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\Downloads.java
# WARNING: Unresolved types: Action, Exception, ListingType, core, gcp, gcs, io, java, kestra, models, plugin, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from integrations.aws.s3.action_interface import ActionInterface
from integrations.azure.storage.blob.models.blob import Blob
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractGcs):
    """Download multiple GCS objects"""
    listing_type: Property[List.ListingType] = Property.ofValue(ListingType.DIRECTORY)
    max_files: Property[int] = Property.ofValue(25)
    from: Property[str] | None = None
    all_versions: Property[bool] | None = None
    reg_exp: Property[str] | None = None
    action: Property[ActionInterface.Action] | None = None
    move_directory: Property[str] | None = None

    @staticmethod
    def perform_action(blob_list: java.util.List[io.kestra.plugin.gcp.gcs.models.Blob], action: ActionInterface.Action, move_directory: Property[str], run_context: RunContext, project_id: Property[str], service_account: Property[str], scopes: Property[java.util.List[str]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blobs: java.util.List[Blob] | None = None
        output_files: dict[str, str] | None = None

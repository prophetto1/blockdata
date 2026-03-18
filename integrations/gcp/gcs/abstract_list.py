from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\AbstractList.java
# WARNING: Unresolved types: BlobListOption, ListingType, Spliterator, cloud, com, google, storage

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from integrations.azure.storage.blob.models.blob import Blob
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class AbstractList(ABC, AbstractGcs):
    from: Property[str]
    listing_type: Property[ListingType] = Property.ofValue(ListingType.DIRECTORY)
    all_versions: Property[bool] | None = None
    reg_exp: Property[str] | None = None

    def iterator(self, connection: Storage, from: str, run_context: RunContext) -> Spliterator[com.google.cloud.storage.Blob]:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, blob: com.google.cloud.storage.Blob, reg_exp: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def options(self, from: str, run_context: RunContext) -> list[Storage.BlobListOption]:
        raise NotImplementedError  # TODO: translate from Java

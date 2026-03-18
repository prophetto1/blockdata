from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\AbstractBucket.java
# WARNING: Unresolved types: BucketInfo, Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from integrations.gcp.bigquery.models.access_control import AccessControl
from integrations.gcp.gcs.models.bucket import Bucket
from integrations.gcp.gcs.models.bucket_lifecycle_rule import BucketLifecycleRule
from integrations.gcp.gcs.models.cors import Cors
from integrations.gcp.gcs.models.iam_configuration import IamConfiguration
from integrations.gcp.gcs.models.logging import Logging
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.gcp.gcs.models.storage_class import StorageClass


@dataclass(slots=True, kw_only=True)
class AbstractBucket(ABC, AbstractGcs):
    name: Property[str]
    requester_pays: Property[bool] | None = None
    versioning_enabled: Property[bool] | None = None
    index_page: Property[str] | None = None
    not_found_page: Property[str] | None = None
    lifecycle_rules: list[BucketLifecycleRule] | None = None
    storage_class: Property[StorageClass] | None = None
    location: Property[str] | None = None
    cors: list[Cors] | None = None
    acl: list[AccessControl] | None = None
    default_acl: list[AccessControl] | None = None
    labels: Property[dict[str, str]] | None = None
    default_kms_key_name: Property[str] | None = None
    default_event_based_hold: Property[bool] | None = None
    retention_period: Property[int] | None = None
    iam_configuration: IamConfiguration | None = None
    logging: Logging | None = None

    def bucket_info(self, run_context: RunContext) -> BucketInfo:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        updated: bool = False
        created: bool = False
        bucket: Bucket | None = None

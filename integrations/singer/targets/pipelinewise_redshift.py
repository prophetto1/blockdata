from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Compression(str, Enum):
    gzip = "gzip"
    bzip2 = "bzip2"


@dataclass(slots=True, kw_only=True)
class PipelinewiseRedshift(AbstractPythonTarget, RunnableTask):
    """Load data into a Redshift database with a Singer target."""
    host: str
    username: str
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    port: Property[int]
    s3_bucket: str
    default_target_schema: str
    access_key_id: Property[str] | None = None
    secret_access_key: Property[str] | None = None
    session_token: Property[str] | None = None
    redshift_copy_role_arn: Property[str] | None = None
    s3_acl: Property[str] | None = None
    s3_key_prefix: Property[str] | None = None
    copy_options: Property[str] | None = None
    batch_size_rows: Property[int] | None = None
    flush_all_streams: Property[bool] | None = None
    parallelism: Property[int] | None = None
    max_parallelism: Property[int] | None = None
    default_target_schema_select_permissions: Property[str] | None = None
    schema_mapping: Property[str] | None = None
    disable_table_cache: Property[bool] | None = None
    add_metadata_columns: Property[bool] | None = None
    hard_delete: Property[bool] | None = None
    data_flattening_max_level: Property[int] | None = None
    primary_key_required: Property[bool] | None = None
    validate_records: Property[bool] | None = None
    skip_updates: Property[bool] | None = None
    compression: Property[Compression] | None = None
    slices: Property[int] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

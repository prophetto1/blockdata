from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseSnowflake(AbstractPythonTarget, RunnableTask):
    """Load data into a Snowflake database with a Singer target."""
    account: str
    database: str
    username: str
    password: Property[str] | None = None
    warehouse: str
    role: Property[str] | None = None
    aws_access_key_id: Property[str] | None = None
    aws_secret_access_key: Property[str] | None = None
    aws_session_token: Property[str] | None = None
    aws_profile: Property[str] | None = None
    s3_bucket: Property[str] | None = None
    s3_key_prefix: Property[str] | None = None
    s3_endpoint_url: Property[str] | None = None
    s3_region_name: Property[str] | None = None
    s3_acl: Property[str] | None = None
    stage: Property[str] | None = None
    file_format: Property[str] | None = None
    batch_size_rows: Property[int] | None = None
    batch_wait_limit: Property[timedelta] | None = None
    flush_all_streams: Property[bool] | None = None
    parallelism: Property[int] | None = None
    parallelism_max: Property[int] | None = None
    default_target_schema: Property[str] | None = None
    default_target_schema_select_permission: Property[str] | None = None
    schema_mapping: Property[str] | None = None
    disable_table_cache: Property[bool] | None = None
    client_side_encryption_master_key: Property[str] | None = None
    add_metadata_columns: Property[bool] | None = None
    hard_delete: Property[bool] | None = None
    data_flattening_max_level: Property[int] | None = None
    primary_key_required: Property[bool] | None = None
    validate_records: Property[bool] | None = None
    no_compression: Property[bool] | None = None
    query_tag: Property[str] | None = None
    archive_load_files: Property[bool] | None = None
    archive_load_files_s3_prefix: Property[str] | None = None
    archive_load_files_s3_bucket: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

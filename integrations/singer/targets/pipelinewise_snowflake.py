from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\PipelinewiseSnowflake.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseSnowflake(AbstractPythonTarget):
    """Load data into a Snowflake database with a Singer target."""
    account: str
    database: str
    username: str
    warehouse: str
    batch_size_rows: Property[int] = Property.ofValue(100000)
    flush_all_streams: Property[bool] = Property.ofValue(false)
    parallelism: Property[int] = Property.ofValue(0)
    parallelism_max: Property[int] = Property.ofValue(16)
    disable_table_cache: Property[bool] = Property.ofValue(false)
    add_metadata_columns: Property[bool] = Property.ofValue(false)
    hard_delete: Property[bool] = Property.ofValue(false)
    data_flattening_max_level: Property[int] = Property.ofValue(0)
    primary_key_required: Property[bool] = Property.ofValue(true)
    validate_records: Property[bool] = Property.ofValue(false)
    no_compression: Property[bool] = Property.ofValue(false)
    archive_load_files: Property[bool] = Property.ofValue(false)
    password: Property[str] | None = None
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
    batch_wait_limit: Property[timedelta] | None = None
    default_target_schema: Property[str] | None = None
    default_target_schema_select_permission: Property[str] | None = None
    schema_mapping: Property[str] | None = None
    client_side_encryption_master_key: Property[str] | None = None
    query_tag: Property[str] | None = None
    archive_load_files_s3_prefix: Property[str] | None = None
    archive_load_files_s3_bucket: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

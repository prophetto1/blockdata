from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\PipelinewiseRedshift.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseRedshift(AbstractPythonTarget):
    """Load data into a Redshift database with a Singer target."""
    host: str
    username: str
    port: Property[int]
    s3_bucket: str
    default_target_schema: str
    batch_size_rows: Property[int] = Property.ofValue(100000)
    flush_all_streams: Property[bool] = Property.ofValue(false)
    parallelism: Property[int] = Property.ofValue(0)
    max_parallelism: Property[int] = Property.ofValue(16)
    disable_table_cache: Property[bool] = Property.ofValue(false)
    add_metadata_columns: Property[bool] = Property.ofValue(false)
    hard_delete: Property[bool] = Property.ofValue(false)
    data_flattening_max_level: Property[int] = Property.ofValue(0)
    primary_key_required: Property[bool] = Property.ofValue(true)
    validate_records: Property[bool] = Property.ofValue(false)
    skip_updates: Property[bool] = Property.ofValue(false)
    compression: Property[Compression] = Property.ofValue(Compression.bzip2)
    slices: Property[int] = Property.ofValue(1)
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_access_key: Property[str] | None = None
    session_token: Property[str] | None = None
    redshift_copy_role_arn: Property[str] | None = None
    s3_acl: Property[str] | None = None
    s3_key_prefix: Property[str] | None = None
    copy_options: Property[str] | None = None
    default_target_schema_select_permissions: Property[str] | None = None
    schema_mapping: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Compression(str, Enum):
        gzip = "gzip"
        bzip2 = "bzip2"

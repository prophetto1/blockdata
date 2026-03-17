from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.opensearch.abstract_task import AbstractTask
from integrations.databricks.job.task.dbt_task_setting import DbtTaskSetting
from integrations.databricks.job.task.library_setting import LibrarySetting
from integrations.databricks.job.task.notebook_task_setting import NotebookTaskSetting
from integrations.databricks.job.task.pipeline_task_setting import PipelineTaskSetting
from engine.core.models.property.property import Property
from integrations.databricks.job.task.python_wheel_task_setting import PythonWheelTaskSetting
from engine.core.runners.run_context import RunContext
from integrations.databricks.job.task.run_job_task_setting import RunJobTaskSetting
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.databricks.job.task.spark_jar_task_setting import SparkJarTaskSetting
from integrations.databricks.job.task.spark_python_task_setting import SparkPythonTaskSetting
from integrations.databricks.job.task.spark_submit_task_setting import SparkSubmitTaskSetting
from integrations.databricks.job.task.sql_task_setting import SqlTaskSetting


@dataclass(slots=True, kw_only=True)
class CreateJob(AbstractTask, RunnableTask):
    """Create and run a Databricks job"""
    job_name: Property[str] | None = None
    wait_for_completion: Property[timedelta] | None = None
    job_tasks: list[JobTaskSetting]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class JobTaskSetting:
        description: Property[str] | None = None
        existing_cluster_id: Property[str] | None = None
        task_key: Property[str] | None = None
        timeout_seconds: Property[int] | None = None
        notebook_task: NotebookTaskSetting | None = None
        dbt_task: DbtTaskSetting | None = None
        spark_submit_task: SparkSubmitTaskSetting | None = None
        sql_task: SqlTaskSetting | None = None
        spark_jar_task: SparkJarTaskSetting | None = None
        spark_python_task: SparkPythonTaskSetting | None = None
        python_wheel_task: PythonWheelTaskSetting | None = None
        pipeline_task: PipelineTaskSetting | None = None
        run_job_task: RunJobTaskSetting | None = None
        depends_on: list[String] | None = None
        libraries: list[LibrarySetting] | None = None

    @dataclass(slots=True)
    class Output(io):
        job_id: int | None = None
        job_u_r_i: str | None = None
        run_id: int | None = None
        run_u_r_i: str | None = None


@dataclass(slots=True, kw_only=True)
class JobTaskSetting:
    description: Property[str] | None = None
    existing_cluster_id: Property[str] | None = None
    task_key: Property[str] | None = None
    timeout_seconds: Property[int] | None = None
    notebook_task: NotebookTaskSetting | None = None
    dbt_task: DbtTaskSetting | None = None
    spark_submit_task: SparkSubmitTaskSetting | None = None
    sql_task: SqlTaskSetting | None = None
    spark_jar_task: SparkJarTaskSetting | None = None
    spark_python_task: SparkPythonTaskSetting | None = None
    python_wheel_task: PythonWheelTaskSetting | None = None
    pipeline_task: PipelineTaskSetting | None = None
    run_job_task: RunJobTaskSetting | None = None
    depends_on: list[String] | None = None
    libraries: list[LibrarySetting] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_id: int | None = None
    job_u_r_i: str | None = None
    run_id: int | None = None
    run_u_r_i: str | None = None

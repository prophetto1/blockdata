from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\CreateClusterAndSubmitSteps.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.emr.abstract_emr_task import AbstractEmrTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.emr.models.step_config import StepConfig


@dataclass(slots=True, kw_only=True)
class CreateClusterAndSubmitSteps(AbstractEmrTask):
    """Create an EMR cluster and run steps"""
    cluster_name: Property[str]
    master_instance_type: Property[str]
    slave_instance_type: Property[str]
    instance_count: Property[int]
    release_label: Property[str] = Property.ofValue("emr-5.20.0")
    job_flow_role: Property[str] = Property.ofValue("EMR_EC2_DefaultRole")
    visible_to_all_users: Property[bool] = Property.ofValue(true)
    service_role: Property[str] = Property.ofValue("EMR_DefaultRole")
    keep_job_flow_alive_when_no_steps: Property[bool] = Property.ofValue(false)
    wait: Property[bool] = Property.ofValue(Boolean.FALSE)
    completion_check_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    wait_until_completion: Property[timedelta] = Property.ofValue(Duration.ofHours(1))
    steps: list[StepConfig] | None = None
    applications: Property[list[str]] | None = None
    log_uri: Property[str] | None = None
    ec2_key_name: Property[str] | None = None
    ec2_subnet_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_flow_id: str | None = None

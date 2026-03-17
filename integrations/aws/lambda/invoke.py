from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\lambda\Invoke.java
# WARNING: Unresolved types: CloudWatchLogsClient, Exception, LambdaClient, ObjectMapper, SdkBytes, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from integrations.aws.abstract_connection import AbstractConnection
from integrations.n8n.content_type import ContentType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Invoke(AbstractConnection):
    """Invoke an AWS Lambda function"""
    function_arn: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    function_payload: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_cloud_watch_logs_client(self, run_context: RunContext) -> CloudWatchLogsClient:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> LambdaClient:
        raise NotImplementedError  # TODO: translate from Java

    def parse_content_type(self, content_type: Optional[str]) -> ContentType:
        raise NotImplementedError  # TODO: translate from Java

    def read_error(self, payload: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_and_log_lambda_logs(self, run_context: RunContext, function_arn: str, start_time: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def extract_function_name(self, function_arn_or_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def handle_error(self, function_arn: str, content_type: ContentType, payload: SdkBytes) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_content(self, run_context: RunContext, function_arn: str, content_type: ContentType, payload: SdkBytes) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ObjectOutput):
        uri: str | None = None
        content_length: int | None = None
        content_type: str | None = None

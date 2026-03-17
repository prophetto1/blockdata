from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\S3Service.java
# WARNING: Unresolved types: Action, CopyObject, Exception, ExecutionException, Filter, GetObjectRequest, GetObjectResponse, IOException, InterruptedException, Pair, S3AsyncClient, S3Client, amazon, awssdk, java, model, s3, services, software, util

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.aws.s3.abstract_s3_object_interface import AbstractS3ObjectInterface
from integrations.aws.s3.action_interface import ActionInterface
from integrations.aws.s3.copy import Copy
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.aws.s3.models.s3_object import S3Object


@dataclass(slots=True, kw_only=True)
class S3Service:

    @staticmethod
    def init_crt() -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def download(run_context: RunContext, client: S3AsyncClient, request: GetObjectRequest) -> Pair[GetObjectResponse, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def perform_action(s3_objects: java.util.List[S3Object], action: Property[ActionInterface.Action], move_to: Copy.CopyObject, run_context: RunContext, abstract_s3_object: AbstractS3ObjectInterface, abstract_s3: AbstractConnectionInterface) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def list(run_context: RunContext, client: S3Client, list: ListInterface, abstract_s3: AbstractS3Object) -> list[S3Object]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def filter(object: software.amazon.awssdk.services.s3.model.S3Object, reg_exp: str, filter: ListInterface.Filter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

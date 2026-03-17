from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\DockerService.java
# WARNING: Unresolved types: DockerClient, DockerClientConfig, IOException

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DockerService:

    @staticmethod
    def client(docker_client_config: DockerClientConfig) -> DockerClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_host(run_context: RunContext, host: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def client(run_context: RunContext, host: str, config: Any, credentials: Credentials, image: str) -> DockerClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_config(run_context: RunContext, config: Any, credentials: list[Credentials], image: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def registry_url_from_image(image: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

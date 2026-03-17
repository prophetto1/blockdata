from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\AbstractGcs.java
# WARNING: Unresolved types: IOException, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class AbstractGcs(ABC, AbstractTask):

    def connection(self, run_context: RunContext) -> Storage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def encode(run_context: RunContext, blob: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def encode(blob: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def blob_path(path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

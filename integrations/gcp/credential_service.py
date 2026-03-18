from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\CredentialService.java
# WARNING: Unresolved types: GoogleCredentials, IOException

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcp_interface import GcpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CredentialService:

    @staticmethod
    def credentials(run_context: RunContext, gcp_interface: GcpInterface) -> GoogleCredentials:
        raise NotImplementedError  # TODO: translate from Java

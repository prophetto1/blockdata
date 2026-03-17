from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\AbstractTask.java
# WARNING: Unresolved types: GeneralSecurityException, HttpCredentialsAdapter, IOException, JsonFactory, NetHttpTransport

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.gcp.gcp_interface import GcpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    j_s_o_n__f_a_c_t_o_r_y: ClassVar[JsonFactory] = GsonFactory.getDefaultInstance()
    read_timeout: Property[int] = Property.ofValue(120)
    service_account: Property[str] | None = None

    def credentials(self, run_context: RunContext) -> HttpCredentialsAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def net_http_transport(self) -> NetHttpTransport:
        raise NotImplementedError  # TODO: translate from Java

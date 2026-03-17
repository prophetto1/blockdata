from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.gcp_interface import GcpInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CredentialService:

    def credentials(self, run_context: RunContext, gcp_interface: GcpInterface) -> GoogleCredentials:
        raise NotImplementedError  # TODO: translate from Java

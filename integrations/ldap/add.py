from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ldap\src\main\java\io\kestra\plugin\ldap\Add.java
# WARNING: Unresolved types: Exception, IOException, LDAPConnection, LDIFReader, Logger

from dataclasses import dataclass, field
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Add(LdapConnection):
    """Add LDIF entries to LDAP"""
    inputs: list[str]
    additions_done: int = 0
    addition_requests: int = 0
    additions_times: list[int] = field(default_factory=list)
    logger: Logger = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def process_entries(self, reader: LDIFReader, connection: LDAPConnection) -> None:
        raise NotImplementedError  # TODO: translate from Java

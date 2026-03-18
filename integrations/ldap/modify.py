from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ldap\src\main\java\io\kestra\plugin\ldap\Modify.java
# WARNING: Unresolved types: Exception, IOException, LDAPConnection, LDAPException, LDIFException, LDIFReader, Logger

from dataclasses import dataclass, field
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Modify(LdapConnection):
    """Apply LDIF changes to LDAP"""
    inputs: list[str]
    logger: Logger = None
    modifications_done: int = 0
    modification_requests: int = 0
    modifications_times: list[int] = field(default_factory=list)

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def process_entries(self, reader: LDIFReader, connection: LDAPConnection) -> None:
        raise NotImplementedError  # TODO: translate from Java

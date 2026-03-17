from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Modify(LdapConnection, RunnableTask):
    """Apply LDIF changes to LDAP"""
    inputs: list[String]
    logger: Logger | None = None
    modifications_done: int | None = None
    modification_requests: int | None = None
    modifications_times: list[Long] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def process_entries(self, reader: LDIFReader, connection: LDAPConnection) -> None:
        raise NotImplementedError  # TODO: translate from Java

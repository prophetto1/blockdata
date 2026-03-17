from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(LdapConnection, RunnableTask):
    """Delete LDAP entries by DN"""
    inputs: list[String]
    deletions_done: int | None = None
    deletion_requests: int | None = None
    deletions_times: list[Long] | None = None
    logger: Logger | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def process_entries(self, reader: LDIFReader, connection: LDAPConnection) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.search_result import SearchResult


@dataclass(slots=True, kw_only=True)
class Search(LdapConnection, RunnableTask):
    """Search LDAP entries and store results"""
    filter: Property[str] | None = None
    attributes: Property[list[String]] | None = None
    base_dn: Property[str] | None = None
    sub: SearchScope | None = None
    size_limit: Property[int] | None = None
    page_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> Search:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search_accepting_size_limit(self, connection: LDAPConnection, request: SearchRequest, logger: Logger, accept_size_limit_exceeded: bool) -> SearchResult:
        raise NotImplementedError  # TODO: translate from Java

    def search_with_optional_paging(self, connection: LDAPConnection, request: SearchRequest, logger: Logger, page_size: int, accept_size_limit_exceeded: bool) -> list[SearchResultEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None

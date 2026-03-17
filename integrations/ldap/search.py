from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ldap\src\main\java\io\kestra\plugin\ldap\Search.java
# WARNING: Unresolved types: Exception, LDAPConnection, LDAPException, Logger, SearchRequest, SearchResultEntry, SearchScope, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.ldap.ldap_connection import LdapConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.search_result import SearchResult


@dataclass(slots=True, kw_only=True)
class Search(LdapConnection):
    """Search LDAP entries and store results"""
    filter: Property[str] = Property.ofValue("(objectclass=*)")
    attributes: Property[list[str]] = Property.ofValue(Collections.singletonList(SearchRequest.ALL_USER_ATTRIBUTES))
    base_dn: Property[str] = Property.ofValue("ou=system")
    sub: SearchScope = SearchScope.SUB
    size_limit: Property[int] | None = None
    page_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> Search.Output:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search_accepting_size_limit(self, connection: LDAPConnection, request: SearchRequest, logger: Logger, accept_size_limit_exceeded: bool) -> SearchResult:
        raise NotImplementedError  # TODO: translate from Java

    def search_with_optional_paging(self, connection: LDAPConnection, request: SearchRequest, logger: Logger, page_size: int, accept_size_limit_exceeded: bool) -> list[SearchResultEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

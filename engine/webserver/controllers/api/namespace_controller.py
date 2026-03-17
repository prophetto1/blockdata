from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\NamespaceController.java
# WARNING: Unresolved types: Comparator, HttpStatusException, N, Pageable

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.api.api_autocomplete import ApiAutocomplete
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.topologies.flow_topology_graph import FlowTopologyGraph
from engine.core.topologies.flow_topology_service import FlowTopologyService
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.models.namespaces.namespace import Namespace
from engine.webserver.responses.paged_results import PagedResults
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class NamespaceController:
    a_u_t_o_c_o_m_p_l_e_t_e__p_a_g_e_a_b_l_e: Pageable = PageableUtils.from(1, 50, null)
    tenant_service: TenantService | None = None
    flow_repository: FlowRepositoryInterface | None = None
    flow_topology_service: FlowTopologyService | None = None
    kestra_config: KestraConfig | None = None

    def sorter(self, pageable: Pageable) -> Comparator[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespaces(self, pageable: Pageable, q: str, force_include_ids: list[str], existing_only: bool) -> ArrayListTotal[N]:
        raise NotImplementedError  # TODO: translate from Java

    def autocomplete_namespaces(self, autocomplete: ApiAutocomplete) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace(self, id: str) -> N:
        raise NotImplementedError  # TODO: translate from Java

    def search_namespaces(self, query: str, page: int, size: int, sort: list[str], existing_only: bool) -> PagedResults[N]:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_dependencies_from_namespace(self, namespace: str, destination_only: bool) -> FlowTopologyGraph:
        raise NotImplementedError  # TODO: translate from Java

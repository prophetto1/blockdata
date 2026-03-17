from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\FlowController.java
# WARNING: Unresolved types: MutableHttpResponse, Publisher, Void

from dataclasses import dataclass, field
from enum import Enum
from logging import Logger, getLogger
from typing import Any, ClassVar, Optional

from engine.webserver.responses.bulk_response import BulkResponse
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.hierarchies.flow_graph import FlowGraph
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_scope import FlowScope
from engine.core.services.flow_service import FlowService
from engine.core.models.topologies.flow_topology_graph import FlowTopologyGraph
from engine.core.topologies.flow_topology_service import FlowTopologyService
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.flows.generic_flow import GenericFlow
from engine.core.services.graph_service import GraphService
from engine.webserver.controllers.domain.id_with_namespace import IdWithNamespace
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.validations.model_validator import ModelValidator
from engine.webserver.responses.paged_results import PagedResults
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.models.query_filter import QueryFilter
from engine.core.models.search_result import SearchResult
from engine.core.models.tasks.task import Task
from engine.core.tenant.tenant_service import TenantService
from engine.core.models.validations.validate_constraint_violation import ValidateConstraintViolation


@dataclass(slots=True, kw_only=True)
class FlowController:
    logger: ClassVar[Logger] = getLogger(__name__)
    warning_json_flow_endpoint: ClassVar[str] = "This endpoint is deprecated. Handling flows as 'application/json' is no longer supported and will be removed in a future release. Please use the same endpoint with an 'application/x-yaml' content type."
    flow_repository: FlowRepositoryInterface | None = None
    plugin_default_service: PluginDefaultService | None = None
    model_validator: ModelValidator | None = None
    flow_topology_service: FlowTopologyService | None = None
    flow_service: FlowService | None = None
    graph_service: GraphService | None = None
    tenant_service: TenantService | None = None
    object_mapper: ObjectMapper | None = None

    def generate_flow_graph(self, namespace: str, id: str, revision: Optional[int], subflows: list[str]) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def generate_flow_graph_from_source(self, flow: str, subflows: list[str]) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow(self, namespace: str, id: str, source: bool, revision: int, allow_deleted: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def list_flow_revisions(self, namespace: str, id: str, allow_delete: bool) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def get_task_from_flow(self, namespace: str, id: str, task_id: str, revision: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def search_flows(self, page: int, size: int, sort: list[str], filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> PagedResults[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def list_flows_by_namespace(self, namespace: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def search_flows_by_source_code(self, page: int, size: int, sort: list[str], query: str, namespace: str) -> PagedResults[SearchResult[Flow]]:
        raise NotImplementedError  # TODO: translate from Java

    def create_flow(self, flow: str) -> HttpResponse[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def create_flow_from_json(self, flow: Flow) -> HttpResponse[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def do_create(self, flow: GenericFlow) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def update_flows_in_namespace(self, namespace: str, flows_publisher: Publisher[CompletedFileUpload], override: bool, delete: bool | None = None) -> list[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def update_flows_in_namespace_from_json(self, namespace: str, flows: list[Flow], delete: bool) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def bulk_update_or_create(self, namespace: str, flows: list[GenericFlow], delete: bool, allow_namespace_child: bool) -> list[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def update_flow(self, namespace: str, id: str, source: str | None = None) -> HttpResponse[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def update_flow_from_json(self, namespace: str, id: str, flow: Flow) -> HttpResponse[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def bulk_update_flows(self, flows: str, delete: bool, namespace: str, allow_namespace_child: bool) -> list[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def update_task(self, namespace: str, id: str, task_id: str, task: Task) -> HttpResponse[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flow(self, namespace: str, id: str) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_revisions(self, namespace: str, id: str, revisions: list[@Min(1) Integer]) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def list_distinct_namespaces(self, query: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_dependencies(self, namespace: str, id: str, destination_only: bool, expand_all: bool) -> FlowTopologyGraph:
        raise NotImplementedError  # TODO: translate from Java

    def validate_flows(self, body: str, flows_publisher: Publisher[CompletedFileUpload], request: HttpRequest[Any]) -> list[ValidateConstraintViolation]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_task(self, task: str, section: TaskValidationType | None = None) -> ValidateConstraintViolation:
        raise NotImplementedError  # TODO: translate from Java

    def validate_trigger(self, trigger: str) -> ValidateConstraintViolation:
        raise NotImplementedError  # TODO: translate from Java

    def export_flows_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def export_flows_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flows_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flows_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def disable_flows_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def disable_flows_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def enable_flows_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_legacy_query_params_to_new_filters(filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, labels: list[str]) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    def enable_flows_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def import_flows(self, file_upload: CompletedFileUpload, fail_on_error: bool) -> HttpResponse[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def export_flows(self, filters: list[QueryFilter]) -> MutableHttpResponse[Flux]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_flow_source(self, source: str) -> GenericFlow:
        raise NotImplementedError  # TODO: translate from Java

    def import_flow(self, tenant_id: str, source: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_task_trigger(self, input: str, cls: type[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    class TaskValidationType(str, Enum):
        TASKS = "TASKS"
        TRIGGERS = "TRIGGERS"

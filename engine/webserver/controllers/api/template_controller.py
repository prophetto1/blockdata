from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\TemplateController.java
# WARNING: Unresolved types: CompletedFileUpload, ConstraintViolationException, HttpStatusException, IOException, Void

from dataclasses import dataclass
from typing import Any

from engine.webserver.responses.bulk_response import BulkResponse
from engine.core.http.http_response import HttpResponse
from engine.webserver.controllers.domain.id_with_namespace import IdWithNamespace
from engine.core.models.validations.model_validator import ModelValidator
from engine.webserver.responses.paged_results import PagedResults
from engine.core.models.templates.template import Template
from engine.core.repositories.template_repository_interface import TemplateRepositoryInterface
from engine.core.tenant.tenant_service import TenantService
from engine.core.models.validations.validate_constraint_violation import ValidateConstraintViolation


@dataclass(slots=True, kw_only=True)
class TemplateController:
    template_repository: TemplateRepositoryInterface | None = None
    model_validator: ModelValidator | None = None
    tenant_service: TenantService | None = None

    def index(self, namespace: str, id: str) -> Template:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, page: int, size: int, sort: list[str], query: str, namespace: str) -> PagedResults[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, template: Template) -> HttpResponse[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, namespace: str, id: str, template: Template) -> HttpResponse[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, namespace: str, id: str) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def list_distinct_namespace(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def update_namespace(self, namespace: str, templates: list[Template], delete: bool) -> list[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def update_complete_namespace(self, namespace: str, templates: list[Template], delete: bool) -> list[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_templates(self, templates: str) -> list[ValidateConstraintViolation]:
        raise NotImplementedError  # TODO: translate from Java

    def export_by_query(self, query: str, namespace: str) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def export_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_query(self, query: str, namespace: str) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_ids(self, ids: list[IdWithNamespace]) -> HttpResponse[BulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def zip_templates(templates: list[Template]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def import_templates(self, file_upload: CompletedFileUpload) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def import_template(self, parsed: Template) -> None:
        raise NotImplementedError  # TODO: translate from Java

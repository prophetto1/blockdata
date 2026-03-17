from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\templates\Template.java
# WARNING: Unresolved types: AnnotatedMember

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.models.has_uid import HasUID
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tasks.task import Task
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class Template:
    yaml_mapper: ClassVar[ObjectMapper]
    id: str
    namespace: str
    deleted: bool = False
    tenant_id: str | None = None
    description: str | None = None
    tasks: list[Task] | None = None
    errors: list[Task] | None = None
    _finally: list[Task] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(tenant_id: str | None = None, namespace: str | None = None, id: str | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def validate_update(self, updated: Template) -> Optional[ValueError]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Template:
        raise NotImplementedError  # TODO: translate from Java

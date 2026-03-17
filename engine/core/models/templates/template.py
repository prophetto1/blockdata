from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\templates\Template.java
# WARNING: Unresolved types: AnnotatedMember, ConstraintViolationException, JacksonAnnotationIntrospector, ObjectMapper

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tasks.task import Task
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class Template:
    id: str
    namespace: str
    y_a_m_l__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofYaml().copy()
        .setAnnotationIntrospector(new JacksonAnnotationIntrospector() {
            @Override
            public boolean hasIgnoreMarker(final AnnotatedMember m) {
                List<String> exclusions = Arrays.asList("revision", "deleted", "source");
                return exclusions.contains(m.getName()) || super.hasIgnoreMarker(m);
            }
        })
        .setDefaultPropertyInclusion(JsonInclude.Include.NON_DEFAULT)
    deleted: bool = False
    tenant_id: str | None = None
    description: str | None = None
    tasks: list[Task] | None = None
    errors: list[Task] | None = None
    _finally: list[Task] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(tenant_id: str, namespace: str, id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def validate_update(self, updated: Template) -> Optional[ConstraintViolationException]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Template:
        raise NotImplementedError  # TODO: translate from Java

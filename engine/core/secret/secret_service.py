from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\secret\SecretService.java
# WARNING: Unresolved types: IOException, META, Pageable

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.query_filter import QueryFilter
from engine.core.secret.secret_not_found_exception import SecretNotFoundException


@dataclass(slots=True, kw_only=True)
class SecretService:
    s_e_c_r_e_t__p_r_e_f_i_x: ClassVar[str] = "SECRET_"
    decoded_secrets: dict[str, str] | None = None

    def post_construct(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def decode(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_secret(self, tenant_id: str, namespace: str, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[META]:
        raise NotImplementedError  # TODO: translate from Java

    def inherited_secrets(self, tenant_id: str, namespace: str) -> dict[str, set[str]]:
        raise NotImplementedError  # TODO: translate from Java

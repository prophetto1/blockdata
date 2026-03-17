from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\BlueprintController.java
# WARNING: Unresolved types: Argument, URISyntaxException

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any, Optional

from engine.core.http.client.http_client import HttpClient
from engine.webserver.responses.paged_results import PagedResults
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class BlueprintController:
    http_client: HttpClient | None = None
    version_provider: VersionProvider | None = None

    def search_blueprints(self, q: Optional[str], sort: Optional[str], tags: Optional[list[str]], page: int, size: int, kind: Kind, http_request: HttpRequest[Any]) -> PagedResults[ApiBlueprintItem]:
        raise NotImplementedError  # TODO: translate from Java

    def get_blueprint_source(self, id: str, kind: Kind, http_request: HttpRequest[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_blueprint_graph(self, id: str, kind: Kind, http_request: HttpRequest[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_blueprint(self, id: str, kind: Kind, http_request: HttpRequest[Any]) -> ApiBlueprintItemWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def list_blueprint_tags(self, kind: Kind, q: Optional[str], http_request: HttpRequest[Any]) -> list[ApiBlueprintTagItem]:
        raise NotImplementedError  # TODO: translate from Java

    def get_api_base_path(self, id: str, kind: Kind | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def fast_forward_to_kestra_api(self, original_request: HttpRequest[Any], new_path: str, additional_query_params: dict[str, Any], return_type: Argument[T] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiBlueprintItemWithSource(ApiBlueprintItem):
        source: str | None = None
        kind: Kind | None = None

    @dataclass(slots=True)
    class ApiBlueprintItem:
        published_at: datetime
        id: str | None = None
        title: str | None = None
        description: str | None = None
        included_tasks: list[str] | None = None
        tags: list[str] | None = None

    @dataclass(slots=True)
    class ApiBlueprintTagItem:
        published_at: datetime
        id: str | None = None
        name: str | None = None

    class Kind(str, Enum):
        APP = "APP"
        DASHBOARD = "DASHBOARD"
        FLOW = "FLOW"

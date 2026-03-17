from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\posthog\PosthogService.java
# WARNING: Unresolved types: PostHog

from dataclasses import dataclass
from typing import Any

from engine.core.utils.edition_provider import EditionProvider
from engine.core.http.client.http_client import HttpClient
from engine.core.services.instance_service import InstanceService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class PosthogService:
    post_hog: PostHog | None = None
    instance_service: InstanceService | None = None
    version_provider: VersionProvider | None = None
    edition_provider: EditionProvider | None = None

    def capture(self, distinct_id: str, event: str, properties: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PosthogConfig:
        api_host: str | None = None
        token: str | None = None

    @dataclass(slots=True)
    class ApiConfig:
        posthog: PosthogConfig | None = None

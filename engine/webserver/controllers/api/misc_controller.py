from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\MiscController.java
# WARNING: Unresolved types: ApplicationContext, Edition, JsonProcessingException, Void

from dataclasses import dataclass, field
from logging import logging
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.webserver.services.basic_auth_credentials import BasicAuthCredentials
from engine.webserver.services.basic_auth_service import BasicAuthService
from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.utils.edition_provider import EditionProvider
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.collectors.execution_usage import ExecutionUsage
from engine.core.reporter.reports.feature_usage_report import FeatureUsageReport
from engine.core.models.collectors.flow_usage import FlowUsage
from engine.core.http.http_response import HttpResponse
from engine.core.services.instance_service import InstanceService
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.repositories.template_repository_interface import TemplateRepositoryInterface
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class MiscController:
    basic_auth_service: Optional[BasicAuthService]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    application_context: ApplicationContext | None = None
    version_provider: VersionProvider | None = None
    dashboard_repository: DashboardRepositoryInterface | None = None
    execution_repository: ExecutionRepositoryInterface | None = None
    instance_service: InstanceService | None = None
    feature_usage_report: FeatureUsageReport | None = None
    template_repository: Optional[TemplateRepositoryInterface] | None = None
    kestra_config: KestraConfig | None = None
    chart_default_duration: str | None = None
    is_anonymous_usage_enabled: bool | None = None
    is_ui_anonymous_usage_enabled: bool | None = None
    environment_name: str | None = None
    environment_color: str | None = None
    kestra_url: str | None = None
    initial_preview_rows: int | None = None
    max_preview_rows: int | None = None
    hidden_labels_prefixes: list[str] | None = None
    queue_type: str | None = None
    plugin_registry: PluginRegistry | None = None
    edition_provider: EditionProvider | None = None

    def get_configuration(self) -> Configuration:
        raise NotImplementedError  # TODO: translate from Java

    def get_usages(self) -> ApiUsage:
        raise NotImplementedError  # TODO: translate from Java

    def create_basic_auth(self, basic_auth_credentials: BasicAuthCredentials) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def get_basic_auth_config_errors(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Configuration:
        uuid: str | None = None
        version: str | None = None
        edition: EditionProvider.Edition | None = None
        commit_id: str | None = None
        chart_default_duration: str | None = None
        commit_date: datetime | None = None
        is_custom_dashboards_enabled: bool | None = None
        is_anonymous_usage_enabled: bool | None = None
        is_ui_anonymous_usage_enabled: bool | None = None
        is_template_enabled: bool | None = None
        environment: Environment | None = None
        url: str | None = None
        preview: Preview | None = None
        system_namespace: str | None = None
        hidden_labels_prefixes: list[str] | None = None
        is_ai_enabled: bool | None = None
        is_basic_auth_initialized: bool | None = None
        plugins_hash: int | None = None
        is_concurrency_view_enabled: bool | None = None

    @dataclass(slots=True)
    class Environment:
        name: str | None = None
        color: str | None = None

    @dataclass(slots=True)
    class Preview:
        initial: int | None = None
        max: int | None = None

    @dataclass(slots=True)
    class ApiUsage:
        flows: FlowUsage | None = None
        executions: ExecutionUsage | None = None

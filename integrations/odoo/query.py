from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-odoo\src\main\java\io\kestra\plugin\odoo\Query.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.odoo.odoo_client import OdooClient
from integrations.odoo.operation import Operation
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Query(Task):
    """Run Odoo XML-RPC operations"""
    url: Property[str]
    db: Property[str]
    username: Property[str]
    password: Property[str]
    model: Property[str]
    operation: Property[Operation]
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    filters: Property[list[Any]] | None = None
    fields: Property[list[str]] | None = None
    values: Property[dict[str, Any]] | None = None
    ids: Property[list[int]] | None = None
    limit: Property[int] | None = None
    offset: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search_read(self, run_context: RunContext, client: OdooClient, model: str, fetch_type: FetchType) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def execute_read(self, run_context: RunContext, client: OdooClient, model: str, fetch_type: FetchType) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def execute_create(self, run_context: RunContext, client: OdooClient, model: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def execute_write(self, run_context: RunContext, client: OdooClient, model: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def execute_unlink(self, run_context: RunContext, client: OdooClient, model: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search(self, run_context: RunContext, client: OdooClient, model: str, fetch_type: FetchType) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def execute_search_count(self, run_context: RunContext, client: OdooClient, model: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def store_records_as_file(self, run_context: RunContext, records: list[Any]) -> StoredResult:
        raise NotImplementedError  # TODO: translate from Java

    def calculate_record_count(self, result: Any, fetch_type: FetchType) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StoredResult:
        uri: str | None = None
        count: int | None = None

        def get_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_count(self) -> int:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: dict[str, Any] | None = None
        rows: list[dict[str, Any]] | None = None
        uri: str | None = None
        size: int | None = None
        ids: list[int] | None = None

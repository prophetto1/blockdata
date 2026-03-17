from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\sql\Query.java
# WARNING: Unresolved types: BufferedWriter, Consumer, Exception, IOException, ObjectMapper, ResultSet, SQLException, Statement, ZoneId, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.databricks.sql.abstract_cell_converter import AbstractCellConverter
from integrations.kubernetes.models.connection import Connection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Query(Task):
    """Run a SQL query on Databricks"""
    host: Property[str]
    http_path: Property[str]
    sql: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()
    catalog: Property[str] | None = None
    schema: Property[str] | None = None
    access_token: Property[str] | None = None
    properties: Property[dict[str, str]] | None = None
    time_zone_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def zone_id(self, run_context: RunContext) -> ZoneId:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_to_file(self, stmt: Statement, rs: ResultSet, writer: BufferedWriter, cell_converter: AbstractCellConverter, connection: Connection) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, stmt: Statement, rs: ResultSet, c: Consumer[dict[str, Any]], cell_converter: AbstractCellConverter, connection: Connection) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def map_result_set_to_map(self, rs: ResultSet, cell_converter: AbstractCellConverter, connection: Connection) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_cell(self, column_index: int, rs: ResultSet, cell_converter: AbstractCellConverter, connection: Connection) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        size: int | None = None

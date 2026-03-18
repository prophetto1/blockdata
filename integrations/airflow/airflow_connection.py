from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airflow\src\main\java\io\kestra\plugin\airflow\AirflowConnection.java
# WARNING: Unresolved types: Exception, HttpClientBuilder, HttpRequestBuilder, ObjectMapper, client, core, http, io, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airflow.model.dag_run_response import DagRunResponse
from engine.core.http.client.http_client import HttpClient
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AirflowConnection(ABC, Task):
    base_url: Property[str]
    object_mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    d_a_g__r_u_n_s__e_n_d_p_o_i_n_t__f_o_r_m_a_t: ClassVar[str] = "%s/api/v1/dags/%s/dagRuns"
    j_s_o_n__c_o_n_t_e_n_t__t_y_p_e: ClassVar[str] = "application/json"
    headers: Property[dict[str, str]] | None = None
    options: HttpConfiguration | None = None

    def trigger_dag(self, run_context: RunContext, dag_id: str, request_body: str) -> DagRunResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_dag_status(self, run_context: RunContext, dag_id: str, dag_run_id: str) -> DagRunResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_client_builder(self, run_context: RunContext) -> io.kestra.core.http.client.HttpClient.HttpClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def get_request_builder(self, run_context: RunContext, uri: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

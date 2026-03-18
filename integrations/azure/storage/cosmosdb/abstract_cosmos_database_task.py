from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\AbstractCosmosDatabaseTask.java
# WARNING: Unresolved types: ConsistencyLevel, CosmosAsyncClient, CosmosAsyncDatabase, Exception, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCosmosDatabaseTask(ABC, AbstractAzureIdentityConnection):
    database_id: Property[str]
    consistency_level: Property[ConsistencyLevel] = Property.ofValue(ConsistencyLevel.SESSION)
    content_response_on_write_enabled: Property[bool] = Property.ofValue(DEFAULT_CONTENT_RESPONSE_ON_WRITE_ENABLED)
    d_e_f_a_u_l_t__c_o_n_s_i_s_t_e_n_c_y__l_e_v_e_l: ClassVar[ConsistencyLevel] = ConsistencyLevel.SESSION
    d_e_f_a_u_l_t__c_o_n_t_e_n_t__r_e_s_p_o_n_s_e__o_n__w_r_i_t_e__e_n_a_b_l_e_d: ClassVar[bool] = True
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None

    def run(self, run_context: RunContext) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def run(self, run_context: RunContext, cosmos_database: CosmosAsyncDatabase) -> T:
        ...

    def get_client(self, run_context: RunContext) -> CosmosAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

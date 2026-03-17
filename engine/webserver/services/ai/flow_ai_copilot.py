from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\FlowAiCopilot.java

from dataclasses import dataclass
from typing import Any

from engine.webserver.services.ai.abstract_ai_copilot import AbstractAiCopilot
from engine.webserver.models.ai.flow_generation_prompt import FlowGenerationPrompt
from engine.webserver.services.ai.flow_yaml_builder import FlowYamlBuilder
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.plugin_finder import PluginFinder
from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class FlowAiCopilot(AbstractAiCopilot):
    a_l_r_e_a_d_y__v_a_l_i_d__m_e_s_s_a_g_e: str = "This flow already performs the requested action. Please provide additional instructions if you would like to request modifications."
    n_o_n__r_e_q_u_e_s_t__e_r_r_o_r: str = "I can only assist with creating Kestra flows."
    u_n_a_b_l_e__t_o__g_e_n_e_r_a_t_e__e_r_r_o_r: str = "The prompt did not provide enough information to generate a valid flow. Please clarify your request."
    p_o_s_s_i_b_l_e__e_r_r_o_r__m_e_s_s_a_g_e_s: list[str] = List.of(ALREADY_VALID_MESSAGE, NON_REQUEST_ERROR, UNABLE_TO_GENERATE_ERROR)
    e_x_c_l_u_d_e_d__p_l_u_g_i_n__t_y_p_e_s: list[str] = List.of(
        STORAGES_GROUP_NAME,
        SECRETS_GROUP_NAME,
        APPS_GROUP_NAME,
        APP_BLOCKS_GROUP_NAME,
        CHARTS_GROUP_NAME,
        DATA_FILTERS_GROUP_NAME,
        DATA_FILTERS_KPI_GROUP_NAME
    )

    def already_valid_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def non_request_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def unable_to_generate_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def possible_error_messages(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def excluded_plugin_types(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_flow(self, plugin_finder: PluginFinder, flow_yaml_builder: FlowYamlBuilder, flow_generation_prompt: FlowGenerationPrompt, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

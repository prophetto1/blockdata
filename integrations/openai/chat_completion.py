from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Role(str, Enum):
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"
    USER = "USER"


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractTask, RunnableTask):
    """Send prompts to OpenAI Chat Completions"""
    messages: Property[list[ChatMessage]] | None = None
    functions: Property[list[PluginChatFunction]] | None = None
    function_call: Property[str] | None = None
    prompt: Property[str] | None = None
    temperature: Property[float] | None = None
    top_p: Property[float] | None = None
    n: Property[int] | None = None
    stop: Property[list[String]] | None = None
    max_tokens: Property[int] | None = None
    presence_penalty: Property[float] | None = None
    frequency_penalty: Property[float] | None = None
    logit_bias: Property[dict[String, Integer]] | None = None
    model: Property[str]
    json_response_schema: Property[str] | None = None
    t_y_p_e: str | None = None
    e_n_u_m: str | None = None
    p_r_o_p_e_r_t_i_e_s: str | None = None
    r_e_q_u_i_r_e_d: str | None = None
    p_a_r_a_m_e_t_e_r_s: str | None = None
    d_e_s_c_r_i_p_t_i_o_n_s: str | None = None
    s_t_r_i_n_g: str | None = None
    o_b_j_e_c_t: str | None = None

    def run(self, run_context: RunContext) -> ChatCompletion:
        raise NotImplementedError  # TODO: translate from Java

    def build_message(self, role: str, content: str) -> ChatCompletionMessageParam:
        raise NotImplementedError  # TODO: translate from Java

    def build_open_a_i_response_format(self, schema_json: str) -> ChatCompletionCreateParams:
        raise NotImplementedError  # TODO: translate from Java

    def to_function_definition(self, run_context: RunContext, function: PluginChatFunction) -> FunctionDefinition:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str | None = None
        object: str | None = None
        model: str | None = None
        choices: list[com] | None = None
        usage: CompletionUsage | None = None

    @dataclass(slots=True)
    class PluginChatFunctionParameter:
        name: Property[str]
        description: Property[str]
        type: Property[str]
        enum_values: Property[list[String]] | None = None
        required: Property[bool] | None = None

    @dataclass(slots=True)
    class PluginChatFunction:
        name: Property[str] | None = None
        description: Property[str] | None = None
        parameters: Property[list[PluginChatFunctionParameter]] | None = None

    @dataclass(slots=True)
    class ChatMessage:
        role: str | None = None
        content: str | None = None
        name: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str | None = None
    object: str | None = None
    model: str | None = None
    choices: list[com] | None = None
    usage: CompletionUsage | None = None


@dataclass(slots=True, kw_only=True)
class PluginChatFunctionParameter:
    name: Property[str]
    description: Property[str]
    type: Property[str]
    enum_values: Property[list[String]] | None = None
    required: Property[bool] | None = None


@dataclass(slots=True, kw_only=True)
class PluginChatFunction:
    name: Property[str] | None = None
    description: Property[str] | None = None
    parameters: Property[list[PluginChatFunctionParameter]] | None = None


@dataclass(slots=True, kw_only=True)
class ChatMessage:
    role: str | None = None
    content: str | None = None
    name: str | None = None

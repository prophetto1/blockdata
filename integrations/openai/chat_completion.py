from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\ChatCompletion.java
# WARNING: Unresolved types: ChatCompletionCreateParams, ChatCompletionMessageParam, Choice, CompletionUsage, Exception, FunctionDefinition, IOException, ResponseFormat, RuntimeException, chat, com, completions, core, io, kestra, models, openai, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractTask):
    """Send prompts to OpenAI Chat Completions"""
    model: Property[str]
    function_call: Property[str] = Property.ofValue("auto")
    temperature: Property[float] = Property.ofValue(1.0)
    top_p: Property[float] = Property.ofValue(1.0)
    n: Property[int] = Property.ofValue(1)
    t_y_p_e: ClassVar[str] = "type"
    e_n_u_m: ClassVar[str] = "enum"
    p_r_o_p_e_r_t_i_e_s: ClassVar[str] = "properties"
    r_e_q_u_i_r_e_d: ClassVar[str] = "required"
    p_a_r_a_m_e_t_e_r_s: ClassVar[str] = "parameters"
    d_e_s_c_r_i_p_t_i_o_n_s: ClassVar[str] = "description"
    s_t_r_i_n_g: ClassVar[str] = "string"
    o_b_j_e_c_t: ClassVar[str] = "object"
    messages: Property[list[ChatMessage]] | None = None
    functions: Property[list[PluginChatFunction]] | None = None
    prompt: Property[str] | None = None
    stop: Property[list[str]] | None = None
    max_tokens: Property[int] | None = None
    presence_penalty: Property[float] | None = None
    frequency_penalty: Property[float] | None = None
    logit_bias: Property[dict[str, int]] | None = None
    json_response_schema: Property[str] | None = None

    def run(self, run_context: RunContext) -> ChatCompletion.Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_message(self, role: str, content: str) -> ChatCompletionMessageParam:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_open_a_i_response_format(schema_json: str) -> ChatCompletionCreateParams.ResponseFormat:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_function_definition(run_context: RunContext, function: PluginChatFunction) -> FunctionDefinition:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: str | None = None
        object: str | None = None
        model: str | None = None
        choices: list[com.openai.models.chat.completions.ChatCompletion.Choice] | None = None
        usage: CompletionUsage | None = None

    @dataclass(slots=True)
    class PluginChatFunctionParameter:
        name: Property[str]
        description: Property[str]
        type: Property[str]
        enum_values: Property[list[str]] | None = None
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

    class Role(str, Enum):
        ASSISTANT = "ASSISTANT"
        SYSTEM = "SYSTEM"
        USER = "USER"

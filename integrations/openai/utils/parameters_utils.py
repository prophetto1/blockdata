from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\utils\ParametersUtils.java
# WARNING: Unresolved types: Exception, IOException, Logger, ObjectMapper, ResponseInputContent, ResponseInputItem, ResponseOutputItem

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ParametersUtils:
    logger: ClassVar[Logger] = LoggerFactory.getLogger(ParametersUtils.class)
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    b_a_s_e64__p_r_e_f_i_x: ClassVar[str] = "data:"

    @staticmethod
    def list_parameters(run_context: RunContext, parameters: Property[Any]) -> list[ResponseInputItem.Message]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_to_messages(run_context: RunContext, rendered_list: list[dict[str, Any]]) -> list[ResponseInputItem.Message]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def process_file_content(content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def process_image_content(run_context: RunContext, content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def process_text_content(content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_kestra_url_to_base64(run_context: RunContext, kestra_url: str, rendered_mime_type: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_output_text(items: list[ResponseOutputItem]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_from_item(item: ResponseOutputItem) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class SupportedMimeType(str, Enum):
        PNG = "PNG"
        JPEG = "JPEG"
        WEBP = "WEBP"
        GIF = "GIF"
        JPG = "JPG"

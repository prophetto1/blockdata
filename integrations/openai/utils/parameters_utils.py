from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class SupportedMimeType(str, Enum):
    PNG = "PNG"
    JPEG = "JPEG"
    WEBP = "WEBP"
    GIF = "GIF"
    JPG = "JPG"


@dataclass(slots=True, kw_only=True)
class ParametersUtils:
    logger: Logger | None = None
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    b_a_s_e64__p_r_e_f_i_x: str | None = None

    def list_parameters(self, run_context: RunContext, parameters: Property[Any]) -> list[ResponseInputItem]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_messages(self, run_context: RunContext, rendered_list: list[Map[String, Object]]) -> list[ResponseInputItem]:
        raise NotImplementedError  # TODO: translate from Java

    def process_file_content(self, content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    def process_image_content(self, run_context: RunContext, content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    def process_text_content(self, content: ResponseInputContent) -> ResponseInputContent:
        raise NotImplementedError  # TODO: translate from Java

    def convert_kestra_url_to_base64(self, run_context: RunContext, kestra_url: str, rendered_mime_type: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_output_text(self, items: list[ResponseOutputItem]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_from_item(self, item: ResponseOutputItem) -> str:
        raise NotImplementedError  # TODO: translate from Java

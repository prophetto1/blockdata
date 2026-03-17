from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class MarkdownConverter:
    logger: Logger | None = None
    mapper: ObjectMapper | None = None
    h_e_a_d_e_r__p_a_t_t_e_r_n: Pattern | None = None
    b_o_l_d__p_a_t_t_e_r_n: Pattern | None = None
    i_t_a_l_i_c__p_a_t_t_e_r_n: Pattern | None = None
    c_o_d_e__p_a_t_t_e_r_n: Pattern | None = None
    l_i_n_k__p_a_t_t_e_r_n: Pattern | None = None
    l_i_s_t__i_t_e_m__p_a_t_t_e_r_n: Pattern | None = None
    n_u_m_b_e_r_e_d__l_i_s_t__p_a_t_t_e_r_n: Pattern | None = None
    c_o_d_e__b_l_o_c_k__p_a_t_t_e_r_n: Pattern | None = None

    def markdown_to_blocks(self, markdown: str) -> ArrayNode:
        raise NotImplementedError  # TODO: translate from Java

    def blocks_to_markdown(self, blocks: JsonNode) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def rich_text_to_markdown(self, rich_text_array: JsonNode) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_paragraph_block(self, text: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_header_block(self, header_line: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_bulleted_list_block(self, list_line: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_numbered_list_block(self, list_line: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_code_block(self, content: str, language: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_rich_text_from_markdown(self, text: str) -> ArrayNode:
        raise NotImplementedError  # TODO: translate from Java

    def create_rich_text_array(self, text: str) -> ArrayNode:
        raise NotImplementedError  # TODO: translate from Java

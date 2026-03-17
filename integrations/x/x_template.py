from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-x\src\main\java\io\kestra\plugin\x\XTemplate.java
# WARNING: Unresolved types: Exception, InvalidKeyException, NoSuchAlgorithmException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.x.abstract_x_connection import AbstractXConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class XTemplate(ABC, AbstractXConnection):
    o_a_u_t_h_1__a_l_g_o_r_i_t_h_m: ClassVar[str] = "HmacSHA1"
    m_a_x__p_o_s_t__l_e_n_g_t_h: ClassVar[int] = 280
    url: Property[str] = Property.ofValue("https://api.x.com/2/tweets")
    bearer_token: Property[str] | None = None
    consumer_key: Property[str] | None = None
    consumer_secret: Property[str] | None = None
    access_token: Property[str] | None = None
    access_secret: Property[str] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    text_body: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_post_text(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_o_auth1_header(self, run_context: RunContext, url: str, consumer_key: str, consumer_secret: str, token: str, secret: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_signature_base_string(self, url: str, params: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def generate_signature(self, signature_base_string: str, signing_key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

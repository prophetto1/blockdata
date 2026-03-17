from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class XTemplate(AbstractHttpOptionsTask):
    o_a_u_t_h_1__a_l_g_o_r_i_t_h_m: str | None = None
    m_a_x__p_o_s_t__l_e_n_g_t_h: int | None = None
    bearer_token: Property[str] | None = None
    consumer_key: Property[str] | None = None
    consumer_secret: Property[str] | None = None
    access_token: Property[str] | None = None
    access_secret: Property[str] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    text_body: Property[str] | None = None
    url: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_post_text(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_o_auth1_header(self, run_context: RunContext, url: str, consumer_key: str, consumer_secret: str, token: str, secret: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_signature_base_string(self, url: str, params: dict[String, String]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def generate_signature(self, signature_base_string: str, signing_key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

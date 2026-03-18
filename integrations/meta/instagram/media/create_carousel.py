from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\instagram\media\CreateCarousel.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.meta.instagram.abstract_instagram_task import AbstractInstagramTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CreateCarousel(AbstractInstagramTask):
    """Publish an Instagram carousel"""
    media_urls: Property[list[str]]
    m_i_n__c_a_r_o_u_s_e_l__i_t_e_m_s: ClassVar[int] = 2
    m_a_x__c_a_r_o_u_s_e_l__i_t_e_m_s: ClassVar[int] = 10
    caption: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_child_media_container(self, run_context: RunContext, ig_id: str, token: str, media_url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_carousel_container(self, run_context: RunContext, ig_id: str, token: str, child_container_ids: list[str], caption: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def publish_media(self, run_context: RunContext, ig_id: str, token: str, container_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        media_id: str | None = None
        carousel_container_id: str | None = None
        child_container_ids: list[str] | None = None

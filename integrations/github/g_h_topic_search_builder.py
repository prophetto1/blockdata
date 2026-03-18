from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GHTopicSearchBuilder.java
# WARNING: Unresolved types: Exception, GHTopic

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.singer.taps.git_hub import GitHub


@dataclass(slots=True, kw_only=True)
class GHTopicSearchBuilder:
    a_c_c_e_p_t__h_e_a_d_e_r: ClassVar[str] = "application/vnd.github+json"
    a_p_i__v_e_r_s_i_o_n__h_e_a_d_e_r: ClassVar[str] = "2022-11-28"
    terms: list[str] = field(default_factory=list)
    parameters: list[str] = field(default_factory=list)
    root: GitHub | None = None
    oauth_token: str | None = None
    items: dict[str, Any] | None = None

    def query(self, query: str) -> GHTopicSearchBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def is(self, value: str) -> GHTopicSearchBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def repositories(self, value: str) -> GHTopicSearchBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def created(self, value: str) -> GHTopicSearchBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def order(self, value: str) -> GHTopicSearchBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def get_api_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_url_with_query(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def list(self) -> GHTopicResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class GHTopicResponse:
        total_count: int | None = None
        incomplete_results: bool | None = None
        items: list[GHTopic] | None = None
        html_url: str | None = None

        @dataclass(slots=True)
        class GHTopic:
            name: str | None = None
            display_name: str | None = None
            short_description: str | None = None
            description: str | None = None
            created_by: str | None = None
            released: str | None = None
            created_at: str | None = None
            updated_at: str | None = None
            featured: bool | None = None
            curated: bool | None = None
            score: int | None = None

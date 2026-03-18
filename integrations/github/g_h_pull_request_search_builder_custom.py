from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GHPullRequestSearchBuilderCustom.java
# WARNING: Unresolved types: GHDirection, GHPullRequest, GHPullRequestSearchBuilder, PagedSearchIterable, Sort

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.taps.git_hub import GitHub


@dataclass(slots=True, kw_only=True)
class GHPullRequestSearchBuilderCustom:
    terms: list[str] = field(default_factory=list)
    search_builder: GHPullRequestSearchBuilder | None = None

    def q(self, qualifier: str, value: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def q(self, value: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def repo(self, repository: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def author(self, user: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def created_by_me(self) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def assigned(self, user: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def mentions(self, user: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def is_open(self) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def is_closed(self) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def is_merged(self) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def is_draft(self) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def head(self, branch: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def base(self, branch: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def commit(self, sha: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def created(self, created: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def merged(self, merged: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def closed(self, closed: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def updated(self, updated: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def label(self, label: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def in_labels(self, labels: list[str]) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def title_like(self, title: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def order(self, direction: GHDirection) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def sort(self, sort: GHPullRequestSearchBuilder.Sort) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def list(self) -> PagedSearchIterable[GHPullRequest]:
        raise NotImplementedError  # TODO: translate from Java

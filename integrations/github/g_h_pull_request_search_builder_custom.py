from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class GHPullRequestSearchBuilderCustom:
    search_builder: GHPullRequestSearchBuilder | None = None
    terms: list[String] | None = None

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

    def in_labels(self, labels: Iterable[String]) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def title_like(self, title: str) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def order(self, direction: GHDirection) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def sort(self, sort: GHPullRequestSearchBuilder) -> GHPullRequestSearchBuilderCustom:
        raise NotImplementedError  # TODO: translate from Java

    def list(self) -> PagedSearchIterable[GHPullRequest]:
        raise NotImplementedError  # TODO: translate from Java

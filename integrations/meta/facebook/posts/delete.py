from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Delete(AbstractFacebookTask):
    """Delete Facebook Page posts"""
    post_ids: Property[java]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        deleted_post_ids: java | None = None
        failed_post_ids: java | None = None
        total_deleted: int | None = None
        total_failed: int | None = None
        all_success: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    deleted_post_ids: java | None = None
    failed_post_ids: java | None = None
    total_deleted: int | None = None
    total_failed: int | None = None
    all_success: bool | None = None

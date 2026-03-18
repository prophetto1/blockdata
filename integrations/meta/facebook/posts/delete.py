from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\posts\Delete.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Delete(AbstractFacebookTask):
    """Delete Facebook Page posts"""
    post_ids: Property[java.util.List[str]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        deleted_post_ids: java.util.List[str] | None = None
        failed_post_ids: java.util.List[str] | None = None
        total_deleted: int | None = None
        total_failed: int | None = None
        all_success: bool | None = None

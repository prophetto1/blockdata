from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Create(AbstractFacebookTask):
    """Publish a Facebook Page post"""
    message: Property[str]
    link: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        post_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    post_id: str | None = None

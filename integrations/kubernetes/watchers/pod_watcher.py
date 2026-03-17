from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.watchers.abstract_watch import AbstractWatch


@dataclass(slots=True, kw_only=True)
class PodWatcher(AbstractWatch):

    def log_context(self, resource: Pod) -> str:
        raise NotImplementedError  # TODO: translate from Java

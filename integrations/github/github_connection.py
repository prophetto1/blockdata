from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.github.github_connection_interface import GithubConnectionInterface
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class GithubConnection(Task, GithubConnectionInterface):
    login: Property[str] | None = None
    oauth_token: Property[str] | None = None
    jwt_token: Property[str] | None = None

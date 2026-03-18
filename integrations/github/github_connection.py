from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GithubConnection.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.github.github_connection_interface import GithubConnectionInterface
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class GithubConnection(ABC, Task):
    login: Property[str] | None = None
    oauth_token: Property[str] | None = None
    jwt_token: Property[str] | None = None

    @dataclass(slots=True)
    class GithubClientConfig:
        login: str | None = None
        oauth_token: str | None = None
        jwt_token: str | None = None

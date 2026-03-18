from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-crypto\src\main\java\io\kestra\plugin\crypto\openpgp\AbstractPgp.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPgp(ABC, Task):

    @staticmethod
    def add_provider() -> None:
        raise NotImplementedError  # TODO: translate from Java

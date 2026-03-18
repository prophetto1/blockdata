from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\AbstractBatch.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractBatch(ABC, AbstractConnection):
    account: Property[str]
    access_key: Property[str]

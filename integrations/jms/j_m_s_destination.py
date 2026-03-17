from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\JMSDestination.java
# WARNING: Unresolved types: AbstractDestination, DestinationType

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JMSDestination:
    destination_name: str
    destination_type: AbstractDestination.DestinationType = AbstractDestination.DestinationType.QUEUE

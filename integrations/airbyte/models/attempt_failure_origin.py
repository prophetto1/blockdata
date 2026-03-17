from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptFailureOrigin.java

from enum import Enum
from typing import Any


class AttemptFailureOrigin(str, Enum):
    SOURCE = "SOURCE"
    DESTINATION = "DESTINATION"
    REPLICATION = "REPLICATION"
    PERSISTENCE = "PERSISTENCE"
    NORMALIZATION = "NORMALIZATION"
    DBT = "DBT"
    AIRBYTE_PLATFORM = "AIRBYTE_PLATFORM"

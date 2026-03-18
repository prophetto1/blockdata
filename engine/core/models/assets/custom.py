from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\Custom.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.assets.asset import Asset


@dataclass(slots=True, kw_only=True)
class Custom(Asset):
    pass

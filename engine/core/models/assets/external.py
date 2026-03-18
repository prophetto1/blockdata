from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\External.java

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.assets.asset import Asset


@dataclass(slots=True, kw_only=True)
class External(Asset):
    asset_type: ClassVar[str]

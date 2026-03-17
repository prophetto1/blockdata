from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\External.java

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.assets.asset import Asset


@dataclass(slots=True, kw_only=True)
class External(Asset):
    a_s_s_e_t__t_y_p_e: ClassVar[str] = External.class.getName()

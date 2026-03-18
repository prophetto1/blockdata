from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\Sha512Filter.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.filters.sha_base_filter import ShaBaseFilter


@dataclass(slots=True, kw_only=True)
class Sha512Filter(ShaBaseFilter):
    pass

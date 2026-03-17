from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\Md5Filter.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.filters.sha_base_filter import ShaBaseFilter


@dataclass(slots=True, kw_only=True)
class Md5Filter(ShaBaseFilter):
    pass

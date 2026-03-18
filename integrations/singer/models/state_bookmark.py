from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\StateBookmark.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StateBookmark:
    bookmarks: dict[str, Any] | None = None

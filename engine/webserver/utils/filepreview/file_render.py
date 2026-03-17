from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\FileRender.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class FileRender(ABC):
    m_a_x__l_i_n_e_s: int = 100
    truncated: bool = False
    extension: str | None = None
    type: Type | None = None
    content: Any | None = None
    max_line: int | None = None

    class Type(str, Enum):
        TEXT = "TEXT"
        LIST = "LIST"
        IMAGE = "IMAGE"
        MARKDOWN = "MARKDOWN"
        PDF = "PDF"

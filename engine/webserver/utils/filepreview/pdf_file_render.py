from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\PdfFileRender.java

from dataclasses import dataclass
from typing import Any

from engine.webserver.utils.filepreview.base64_render import Base64Render


@dataclass(slots=True, kw_only=True)
class PdfFileRender(Base64Render):
    pass

from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\Base64Render.java
# WARNING: Unresolved types: IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.webserver.utils.filepreview.file_render import FileRender


@dataclass(slots=True, kw_only=True)
class Base64Render(FileRender):
    pass

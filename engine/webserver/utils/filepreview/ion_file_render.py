from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\IonFileRender.java
# WARNING: Unresolved types: IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.webserver.utils.filepreview.file_render import FileRender


@dataclass(slots=True, kw_only=True)
class IonFileRender(FileRender):

    def render_content(self, filestream: InputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

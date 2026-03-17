from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\DefaultFileRender.java
# WARNING: Unresolved types: Charset, IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.webserver.utils.filepreview.file_render import FileRender
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class DefaultFileRender(FileRender):

    def render_content(self, file_stream: InputStream, charset: Charset) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def truncate_string_size(self, content: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

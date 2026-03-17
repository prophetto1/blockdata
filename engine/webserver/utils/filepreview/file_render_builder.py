from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\FileRenderBuilder.java
# WARNING: Unresolved types: Charset

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.webserver.utils.filepreview.file_render import FileRender


@dataclass(slots=True, kw_only=True)
class FileRenderBuilder:
    default_file_charset: ClassVar[Charset] = StandardCharsets.UTF_8

    @staticmethod
    def of(extension: str, filestream: Any, charset: Optional[Charset], max_line: int) -> FileRender:
        raise NotImplementedError  # TODO: translate from Java

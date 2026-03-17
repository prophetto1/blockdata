from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\FileRenderBuilder.java
# WARNING: Unresolved types: Charset, IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.webserver.utils.filepreview.file_render import FileRender


@dataclass(slots=True, kw_only=True)
class FileRenderBuilder:
    d_e_f_a_u_l_t__f_i_l_e__c_h_a_r_s_e_t: Charset = StandardCharsets.UTF_8

    @staticmethod
    def of(extension: str, filestream: InputStream, charset: Optional[Charset], max_line: int) -> FileRender:
        raise NotImplementedError  # TODO: translate from Java

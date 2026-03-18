from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\filepreview\ImageFileRender.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.webserver.utils.filepreview.base64_render import Base64Render


@dataclass(slots=True, kw_only=True)
class ImageFileRender(Base64Render):

    class ImageFileExtension(str, Enum):
        JPG = "JPG"
        JPEG = "JPEG"
        PNG = "PNG"
        SVG = "SVG"
        GIF = "GIF"
        BMP = "BMP"
        WEBP = "WEBP"

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-n8n\src\main\java\io\kestra\plugin\n8n\HttpMethod.java

from enum import Enum
from typing import Any


class HttpMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"

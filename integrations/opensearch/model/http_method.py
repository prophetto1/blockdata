from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\model\HttpMethod.java

from enum import Enum
from typing import Any


class HttpMethod(str, Enum):
    CONNECT = "CONNECT"
    CUSTOM = "CUSTOM"
    DELETE = "DELETE"
    GET = "GET"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"
    PATCH = "PATCH"
    POST = "POST"
    PUT = "PUT"
    TRACE = "TRACE"

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\SchemaType.java

from enum import Enum
from typing import Any


class SchemaType(str, Enum):
    FLOW = "FLOW"
    TEMPLATE = "TEMPLATE"
    TASK = "TASK"
    TRIGGER = "TRIGGER"
    PLUGINDEFAULT = "PLUGINDEFAULT"
    APPS = "APPS"
    TESTSUITES = "TESTSUITES"
    DASHBOARD = "DASHBOARD"

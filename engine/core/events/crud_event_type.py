from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\events\CrudEventType.java

from enum import Enum
from typing import Any


class CrudEventType(str, Enum):
    READ = "READ"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    IMPERSONATE = "IMPERSONATE"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"

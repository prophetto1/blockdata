from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-couchbase\src\main\java\io\kestra\plugin\couchbase\CouchbaseConnectionInterface.java

from typing import Any, Protocol


class CouchbaseConnectionInterface(Protocol):
    def get_connection_string(self) -> str: ...

    def get_username(self) -> str: ...

    def get_password(self) -> str: ...

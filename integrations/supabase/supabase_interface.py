from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-supabase\src\main\java\io\kestra\plugin\supabase\SupabaseInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class SupabaseInterface(Protocol):
    def get_url(self) -> Property[str]: ...

    def get_api_key(self) -> Property[str]: ...

    def get_schema(self) -> Property[str]: ...

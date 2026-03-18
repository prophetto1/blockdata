from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\models\Person.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Person:
    id: int | None = None
    name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    emails: list[EmailInfo] | None = None
    phones: list[PhoneInfo] | None = None
    org_id: int | None = None
    owner_id: int | None = None
    visible_to: str | None = None
    add_time: str | None = None
    update_time: str | None = None
    custom_fields: dict[str, Any] | None = None

    @dataclass(slots=True)
    class EmailInfo:
        value: str | None = None
        primary: bool | None = None
        label: str | None = None

    @dataclass(slots=True)
    class PhoneInfo:
        value: str | None = None
        primary: bool | None = None
        label: str | None = None

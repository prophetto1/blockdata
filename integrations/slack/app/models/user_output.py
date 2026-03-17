from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class UserOutput(io):
    id: str | None = None
    team_id: str | None = None
    name: str | None = None
    deleted: bool | None = None
    color: str | None = None
    real_name: str | None = None
    tz: str | None = None
    tz_label: str | None = None
    tz_offset: int | None = None
    profile: UserProfile | None = None
    is_admin: bool | None = None
    is_owner: bool | None = None
    is_primary_owner: bool | None = None
    is_restricted: bool | None = None
    is_ultra_restricted: bool | None = None
    is_bot: bool | None = None
    is_app_user: bool | None = None
    updated: datetime | None = None
    has2fa: bool | None = None

    def of(self, user: com) -> UserOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class UserProfile:
        title: str | None = None
        phone: str | None = None
        skype: str | None = None
        real_name: str | None = None
        real_name_normalized: str | None = None
        display_name: str | None = None
        display_name_normalized: str | None = None
        status_text: str | None = None
        status_emoji: str | None = None
        status_expiration: datetime | None = None
        avatar_hash: str | None = None
        email: str | None = None
        image24: str | None = None
        image32: str | None = None
        image48: str | None = None
        image72: str | None = None
        image192: str | None = None
        image512: str | None = None
        team: str | None = None

        def of(self, profile: com) -> UserProfile:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class UserProfile:
    title: str | None = None
    phone: str | None = None
    skype: str | None = None
    real_name: str | None = None
    real_name_normalized: str | None = None
    display_name: str | None = None
    display_name_normalized: str | None = None
    status_text: str | None = None
    status_emoji: str | None = None
    status_expiration: datetime | None = None
    avatar_hash: str | None = None
    email: str | None = None
    image24: str | None = None
    image32: str | None = None
    image48: str | None = None
    image72: str | None = None
    image192: str | None = None
    image512: str | None = None
    team: str | None = None

    def of(self, profile: com) -> UserProfile:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class FtpsInterface(Protocol):
    def get_mode(self) -> Property[FtpsMode]: ...
    def get_data_channel_protection_level(self) -> Property[FtpsDataChannelProtectionLevel]: ...
    def get_insecure_trust_all_certificates(self) -> Property[bool]: ...

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\encryption\EncryptionService.java
# WARNING: Unresolved types: GeneralSecurityException, IllegalArgumentException, SecureRandom

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class EncryptionService:
    secure_random: ClassVar[SecureRandom]
    cipher_algorithm: ClassVar[str] = "AES/GCM/NoPadding"
    key_algorithm: ClassVar[str] = "AES"
    iv_length: ClassVar[int] = 12
    auth_tag_length: ClassVar[int] = 128

    @staticmethod
    def encrypt(key: str, plain_text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def encrypt(key: str, plain_text: list[int]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decrypt(key: str, cipher_text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decrypt(key: str, cipher_text: list[int]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_iv() -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

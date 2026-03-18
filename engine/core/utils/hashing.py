from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Hashing.java
# WARNING: Unresolved types: HashCode

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Hashing:

    @staticmethod
    def hash_to_string(value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def hash_to_long(value: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sha512_hash(value: list[int], salt: list[int]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def encode_bytes_to_hex(bytes: list[int]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decode_hex_to_bytes(value: str) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_hash_string(value: str) -> HashCode:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Version.java
# WARNING: Unresolved types: Comparable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Version:
    z_e_r_o: Version = new Version(0, 0, 0, null)
    major_version: int | None = None
    minor_version: int | None = None
    patch_version: int | None = None
    qualifier: Qualifier | None = None
    original_version: str | None = None

    @staticmethod
    def is_equal(v1: str, v2: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_equal(v1: Version, v2: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(version: Any) -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_stable(from: Version, versions: list[Version]) -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_latest() -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_latest(versions: list[Version]) -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_oldest() -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_oldest(versions: list[Version]) -> Version:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def require_positive(version: int, message: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def major_version(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def minor_version(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def patch_version(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def qualifier(self) -> Qualifier:
        raise NotImplementedError  # TODO: translate from Java

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def hash_code(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def compare_to(self, that: Version) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def has_only_major(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_major_and_minor_only(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_before(self, version: Version) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_qualifier_number(qualifier: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_uniform_qualifier(qualifier: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Qualifier:
        d_e_f_a_u_l_t__q_u_a_l_i_f_i_e_r__n_a_m_e: list[str] | None = None
        qualifier: str | None = None
        label: str | None = None
        priority: int | None = None
        number: int | None = None

        def equals(self, that: Any) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def hash_code(self) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def compare_to(self, that: Qualifier) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

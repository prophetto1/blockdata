from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Either.java
# WARNING: Unresolved types: Function, L, LL, R, RR, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class Either(ABC):

    @staticmethod
    def left(value: L) -> Either[L, R]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def right(value: R) -> Either[L, R]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def is_left(self) -> bool:
        ...

    @abstractmethod
    def is_right(self) -> bool:
        ...

    @abstractmethod
    def get_left(self) -> L:
        ...

    @abstractmethod
    def get_right(self) -> R:
        ...

    def left(self) -> LeftProjection[L, R]:
        raise NotImplementedError  # TODO: translate from Java

    def right(self) -> RightProjection[L, R]:
        raise NotImplementedError  # TODO: translate from Java

    def fold(self, fl: Function[L, T], fr: Function[R, T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Left(Either):
        value: L | None = None

        def is_left(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def is_right(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def get_left(self) -> L:
            raise NotImplementedError  # TODO: translate from Java

        def get_right(self) -> R:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Right(Either):
        value: R | None = None

        def is_left(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def is_right(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def get_left(self) -> L:
            raise NotImplementedError  # TODO: translate from Java

        def get_right(self) -> R:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LeftProjection:
        either: Either[L, R] | None = None

        def exists(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def get(self) -> L:
            raise NotImplementedError  # TODO: translate from Java

        def map(self, fn: Function[Any, Any]) -> Either[LL, R]:
            raise NotImplementedError  # TODO: translate from Java

        def flat_map(self, fn: Function[Any, Either[LL, R]]) -> Either[LL, R]:
            raise NotImplementedError  # TODO: translate from Java

        def to_optional(self) -> Optional[L]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RightProjection:
        either: Either[L, R] | None = None

        def exists(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def get(self) -> R:
            raise NotImplementedError  # TODO: translate from Java

        def map(self, fn: Function[Any, Any]) -> Either[L, RR]:
            raise NotImplementedError  # TODO: translate from Java

        def flat_map(self, fn: Function[Any, Either[L, RR]]) -> Either[L, RR]:
            raise NotImplementedError  # TODO: translate from Java

        def to_optional(self) -> Optional[R]:
            raise NotImplementedError  # TODO: translate from Java

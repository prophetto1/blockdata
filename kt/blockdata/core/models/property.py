from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class Property(Generic[T]):
    value: T | None = None

    @classmethod
    def of_value(cls, value: T) -> "Property[T]":
        return cls(value=value)

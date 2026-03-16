from __future__ import annotations

from collections import deque
from typing import Deque, Generic, TypeVar

from blockdata.core.models.flows.state import State

T = TypeVar("T")


class InMemoryQueue(Generic[T]):
    def __init__(self) -> None:
        self._items: Deque[tuple[State, T]] = deque()

    def emit(self, item: T, *, state: State = State.CREATED) -> None:
        self._items.append((state, item))

    def receive_nowait(self) -> T:
        _, item = self._items.popleft()
        return item

    def is_empty(self) -> bool:
        return not self._items

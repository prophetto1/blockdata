from __future__ import annotations

from enum import Enum


class FetchType(str, Enum):
    FETCH = "FETCH"
    STORE = "STORE"
    FETCH_ONE = "FETCH_ONE"
    NONE = "NONE"

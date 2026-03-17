from __future__ import annotations

from enum import Enum
from typing import Any


class StorageClass(str, Enum):
    REGIONAL = "REGIONAL"
    MULTI_REGIONAL = "MULTI_REGIONAL"
    NEARLINE = "NEARLINE"
    COLDLINE = "COLDLINE"
    STANDARD = "STANDARD"
    ARCHIVE = "ARCHIVE"
    DURABLE_REDUCED_AVAILABILITY = "DURABLE_REDUCED_AVAILABILITY"

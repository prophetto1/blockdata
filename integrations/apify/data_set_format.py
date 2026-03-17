from __future__ import annotations

from enum import Enum
from typing import Any


class DataSetFormat(str, Enum):
    JSON = "JSON"
    JSONL = "JSONL"
    XML = "XML"
    CSV = "CSV"
    XLSX = "XLSX"
    RSS = "RSS"

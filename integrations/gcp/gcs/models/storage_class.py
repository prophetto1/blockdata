from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\StorageClass.java

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

from __future__ import annotations

from enum import Enum
from typing import Any


class S3ServerSideEncryption(str, Enum):
    NONE = "NONE"
    AES256 = "AES256"
    AWS_KMS = "AWS_KMS"

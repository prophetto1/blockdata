from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\models\S3ServerSideEncryption.java

from enum import Enum
from typing import Any


class S3ServerSideEncryption(str, Enum):
    NONE = "NONE"
    AES256 = "AES256"
    AWS_KMS = "AWS_KMS"

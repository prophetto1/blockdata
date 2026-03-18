from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\AbstractS3ObjectInterface.java

from typing import Any, Protocol

from integrations.aws.s3.abstract_s3 import AbstractS3
from engine.core.models.property.property import Property


class AbstractS3ObjectInterface(AbstractS3, Protocol):
    def get_bucket(self) -> Property[str]: ...

    def get_request_payer(self) -> Property[str]: ...

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\models\BlobImmutabilityPolicy.java
# WARNING: Unresolved types: BlobImmutabilityPolicyMode, azure, blob, com, models, storage

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BlobImmutabilityPolicy:
    expiry_time: datetime | None = None
    policy_mode: BlobImmutabilityPolicyMode | None = None

    def to(self, run_context: RunContext) -> com.azure.storage.blob.models.BlobImmutabilityPolicy:
        raise NotImplementedError  # TODO: translate from Java

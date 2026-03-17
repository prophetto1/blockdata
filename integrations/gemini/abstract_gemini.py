from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\AbstractGemini.java
# WARNING: Unresolved types: Candidate, CitationMetadata, GenerateContentResponseUsageMetadata, SafetyRating

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractGemini(ABC, Task):
    api_key: Property[str]
    model: Property[str]

    def send_metrics(self, run_context: RunContext, metadata: list[GenerateContentResponseUsageMetadata]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Prediction:
        safety_ratings: Optional[list[SafetyRating]] | None = None
        citation_metadata: CitationMetadata | None = None
        content: str | None = None

        @staticmethod
        def of(candidate: Candidate) -> Prediction:
            raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\AbstractGenerativeAi.java
# WARNING: Unresolved types: Candidate, GenerateContentResponse, GenerativeModel, SafetyRating, UsageMetadata, VertexAI, api, cloud, com, google, vertexai

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGenerativeAi(ABC, AbstractTask):
    region: Property[str]
    u_r_i__p_a_t_t_e_r_n: ClassVar[str] = "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict"
    parameters: ModelParameter = ModelParameter.builder().build()
    model_id: Property[str] = Property.ofValue("gemini-pro")

    def build_model(self, model_name: str, vertex_a_i: VertexAI) -> GenerativeModel:
        raise NotImplementedError  # TODO: translate from Java

    def send_metrics(self, run_context: RunContext, metadata: GenerateContentResponse.UsageMetadata) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send_metrics(self, run_context: RunContext, metadatas: list[GenerateContentResponse.UsageMetadata]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ModelParameter:
        temperature: float = 0.2F
        max_output_tokens: int = 128
        top_k: int = 40
        top_p: float = 0.95F

    @dataclass(slots=True)
    class Prediction:
        safety_attributes: SafetyAttributes | None = None
        citation_metadata: CitationMetadata | None = None
        content: str | None = None

        @staticmethod
        def of(candidate: Candidate) -> Prediction:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CitationMetadata:
        citations: list[Citation] | None = None

        @staticmethod
        def of(citation_metadata: com.google.cloud.vertexai.api.CitationMetadata) -> CitationMetadata:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Citation:
        citations: list[str] | None = None

    @dataclass(slots=True)
    class SafetyAttributes:
        scores: list[float] | None = None
        categories: list[str] | None = None
        blocked: bool | None = None

        @staticmethod
        def of(safety_ratings_list: list[SafetyRating]) -> SafetyAttributes:
            raise NotImplementedError  # TODO: translate from Java

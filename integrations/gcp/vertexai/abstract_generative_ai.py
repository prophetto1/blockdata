from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGenerativeAi(AbstractTask):
    u_r_i__p_a_t_t_e_r_n: str | None = None
    region: Property[str]
    parameters: ModelParameter | None = None
    model_id: Property[str] | None = None

    def build_model(self, model_name: str, vertex_a_i: VertexAI) -> GenerativeModel:
        raise NotImplementedError  # TODO: translate from Java

    def send_metrics(self, run_context: RunContext, metadata: GenerateContentResponse) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send_metrics(self, run_context: RunContext, metadatas: list[GenerateContentResponse]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ModelParameter:
        temperature: float = 0.2F
        max_output_tokens: int = 128
        top_k: int = 40
        top_p: float = 0.95F


@dataclass(slots=True, kw_only=True)
class ModelParameter:
    temperature: float = 0.2F
    max_output_tokens: int = 128
    top_k: int = 40
    top_p: float = 0.95F

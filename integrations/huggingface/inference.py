from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.huggingface.abstract_http_task import AbstractHttpTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Inference(AbstractHttpTask, RunnableTask):
    """Call the HuggingFace Inference API."""
    h_u_g_g_i_n_g_f_a_c_e__b_a_s_e__e_n_d_p_o_i_n_t: str | None = None
    w_a_i_t__h_e_a_d_e_r: str | None = None
    c_a_c_h_e__h_e_a_d_e_r: str | None = None
    api_key: Property[str]
    model: Property[str]
    inputs: Property[str]
    parameters: Property[dict[String, Object]] | None = None
    endpoint: Property[str] | None = None
    use_cache: Property[bool] | None = None
    wait_for_model: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Inference:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        output: Any | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    output: Any | None = None

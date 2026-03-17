from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-huggingface\src\main\java\io\kestra\plugin\huggingface\Inference.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.huggingface.abstract_http_task import AbstractHttpTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Inference(AbstractHttpTask):
    """Call the HuggingFace Inference API."""
    api_key: Property[str]
    model: Property[str]
    inputs: Property[str]
    h_u_g_g_i_n_g_f_a_c_e__b_a_s_e__e_n_d_p_o_i_n_t: ClassVar[str] = "https://api-inference.huggingface.co/models"
    w_a_i_t__h_e_a_d_e_r: ClassVar[str] = "x-wait-for-model"
    c_a_c_h_e__h_e_a_d_e_r: ClassVar[str] = "x-use-cache"
    endpoint: Property[str] = Property.ofValue(HUGGINGFACE_BASE_ENDPOINT)
    use_cache: Property[bool] = Property.ofValue(true)
    wait_for_model: Property[bool] = Property.ofValue(false)
    parameters: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Inference.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        output: Any | None = None

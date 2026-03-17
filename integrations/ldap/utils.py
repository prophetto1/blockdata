from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Utils:

    def resolve_kestra_uri(self, file: str, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_l_d_i_f_reader_from_uri(self, file: str, run_context: RunContext) -> LDIFReader:
        raise NotImplementedError  # TODO: translate from Java

    def get_i_o_n_reader_from_uri(self, file: str, run_context: RunContext) -> IonReader:
        raise NotImplementedError  # TODO: translate from Java

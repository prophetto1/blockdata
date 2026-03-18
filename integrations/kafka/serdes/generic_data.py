from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\serdes\GenericData.java
# WARNING: Unresolved types: apache, avro, generic, org

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class GenericData(ABC):
    g_e_n_e_r_i_c__d_a_t_a: ClassVar[org.apache.avro.generic.GenericData] = new org.apache.avro.generic.GenericData()

    @staticmethod
    def get() -> org.apache.avro.generic.GenericData:
        raise NotImplementedError  # TODO: translate from Java

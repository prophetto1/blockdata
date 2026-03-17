from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\utils\TimeUtils.java
# WARNING: Unresolved types: DateTimeFormatter, Pattern, TemporalAccessor

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TimeUtils:
    n_u_m_e_r_i_c__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("^\\d+$")
    n_e_e_d_s__t_i_m_e_z_o_n_e: ClassVar[Pattern] = Pattern.compile("^(?!.*[Z+-]).*")
    f_o_r_m_a_t_t_e_r_s: ClassVar[list[DateTimeFormatter]] = List.of(
        DateTimeFormatter.ISO_INSTANT,
        DateTimeFormatter.ISO_OFFSET_DATE_TIME,
        DateTimeFormatter.ISO_ZONED_DATE_TIME,
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm[:ss][.SSS][XXX][VV]"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm[:ss][.SSS][XXX][VV]"),
        DateTimeFormatter.ISO_LOCAL_DATE_TIME,
        DateTimeFormatter.ISO_LOCAL_DATE
    )

    @staticmethod
    def to_instant(input: Any) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_epoch(epoch: int) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_string(str: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_temporal(temporal: TemporalAccessor) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

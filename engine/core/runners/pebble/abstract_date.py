from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\AbstractDate.java
# WARNING: Unresolved types: DateTimeFormatter, EvaluationContext, FormatStyle, ZoneId

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class AbstractDate(ABC):
    f_o_r_m_a_t_t_e_r_s: ClassVar[dict[str, DateTimeFormatter]] = ImmutableMap.<String, DateTimeFormatter>builder()
        .put("iso", DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX"))
        .put("iso_milli", DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"))
        .put("iso_sec", DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX"))
        .put("sql", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS"))
        .put("sql_milli", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"))
        .put("sql_sec", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        .put("iso_date_time", DateTimeFormatter.ISO_DATE_TIME)
        .put("iso_date", DateTimeFormatter.ISO_DATE)
        .put("iso_time", DateTimeFormatter.ISO_TIME)
        .put("iso_local_date", DateTimeFormatter.ISO_LOCAL_DATE)
        .put("iso_instant", DateTimeFormatter.ISO_INSTANT)
        .put("iso_local_date_time", DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        .put("iso_local_time", DateTimeFormatter.ISO_LOCAL_TIME)
        .put("iso_offset_time", DateTimeFormatter.ISO_OFFSET_TIME)
        .put("iso_ordinal_date", DateTimeFormatter.ISO_ORDINAL_DATE)
        .put("iso_week_date", DateTimeFormatter.ISO_WEEK_DATE)
        .put("iso_zoned_date_time", DateTimeFormatter.ISO_ZONED_DATE_TIME)
        .put("rfc_1123_date_time", DateTimeFormatter.RFC_1123_DATE_TIME)
        .build()
    s_t_y_l_e_s: ClassVar[dict[str, FormatStyle]] = ImmutableMap.of(
        "full", FormatStyle.FULL,
        "long", FormatStyle.LONG,
        "medium", FormatStyle.MEDIUM,
        "short", FormatStyle.SHORT
    )

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format(input: Any, args: dict[str, Any], context: EvaluationContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def formatter(format: str) -> DateTimeFormatter:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def zone_id(input: str) -> ZoneId:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert(value: Any, zone_id: ZoneId, existing_format: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

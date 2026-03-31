from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.contract import safe_attributes

ADMIN_CONFIG_DOCLING_TRACER_NAME: str = "platform.admin.config.docling"
ADMIN_CONFIG_DOCLING_METER_NAME: str = "platform.admin.config.docling"
ADMIN_CONFIG_DOCLING_READ_COUNTER_NAME: str = "platform.admin.config.docling.read.count"
ADMIN_CONFIG_DOCLING_UPDATE_COUNTER_NAME: str = "platform.admin.config.docling.update.count"

admin_config_docling_tracer = trace.get_tracer(ADMIN_CONFIG_DOCLING_TRACER_NAME)
_meter = metrics.get_meter(ADMIN_CONFIG_DOCLING_METER_NAME)

_read_count = _meter.create_counter(ADMIN_CONFIG_DOCLING_READ_COUNTER_NAME)
_update_count = _meter.create_counter(ADMIN_CONFIG_DOCLING_UPDATE_COUNTER_NAME)


def _clean(attrs: dict[str, object | None]) -> dict[str, object]:
    return safe_attributes({key: value for key, value in attrs.items() if value is not None})


def record_admin_config_docling_read(
    *,
    result: str,
    duration_ms: float,
    http_status_code: int,
) -> None:
    _read_count.add(
        1,
        _clean(
            {
                "result": result,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_admin_config_docling_update(
    *,
    result: str,
    docling_blocks_mode: str,
    duration_ms: float,
    http_status_code: int,
) -> None:
    attrs = _clean(
        {
            "result": result,
            "docling_blocks_mode": docling_blocks_mode,
            "http.status_code": http_status_code,
        }
    )
    _update_count.add(1, attrs)

from __future__ import annotations

import csv
import hashlib
import io
import json
import random
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from opentelemetry import metrics, trace


tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

dataset_materialization_duration_ms = meter.create_histogram(
    "agchain.datasets.materialization.duration_ms"
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _validation_error(*, code: str, message: str, field_errors: dict[str, Any] | None = None) -> None:
    raise HTTPException(
        status_code=422,
        detail={
            "code": code,
            "message": message,
            "field_errors": field_errors or {},
        },
    )


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _read_text_source(source_uri: str | None, source_config_jsonb: dict[str, Any]) -> str:
    if isinstance(source_config_jsonb.get("inline_text"), str):
        return str(source_config_jsonb["inline_text"])
    if not source_uri:
        _validation_error(
            code="dataset_source_missing",
            message="A source_uri or inline source payload is required",
            field_errors={"source_uri": "missing"},
        )
    source_path = Path(str(source_uri).replace("file://", ""))
    if not source_path.exists():
        _validation_error(
            code="dataset_source_not_found",
            message="Dataset source path could not be read",
            field_errors={"source_uri": str(source_uri)},
        )
    encoding = str(source_config_jsonb.get("encoding") or "utf-8")
    return source_path.read_text(encoding=encoding)


def _load_source_records(
    *,
    source_type: str,
    source_uri: str | None,
    source_upload_id: str | None,
    source_config_jsonb: dict[str, Any],
) -> list[dict[str, Any]]:
    inline_rows = source_config_jsonb.get("inline_rows")
    if isinstance(inline_rows, list):
        return [row if isinstance(row, dict) else {"value": row} for row in inline_rows]

    if source_upload_id and not source_uri:
        source_uri = source_upload_id

    if source_type == "csv":
        text = _read_text_source(source_uri, source_config_jsonb)
        delimiter = str(source_config_jsonb.get("delimiter") or ",")
        headers = source_config_jsonb.get("headers", True)
        if headers is False:
            rows = csv.reader(io.StringIO(text), delimiter=delimiter)
            return [{"columns": row} for row in rows]
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        return [dict(row) for row in reader]

    if source_type == "json":
        text = _read_text_source(source_uri, source_config_jsonb)
        payload = json.loads(text)
        if isinstance(payload, list):
            return [row if isinstance(row, dict) else {"value": row} for row in payload]
        if isinstance(payload, dict):
            for hint in _as_list(source_config_jsonb.get("path_hints")):
                if hint.startswith("$.") and isinstance(payload.get(hint[2:]), list):
                    return [
                        row if isinstance(row, dict) else {"value": row}
                        for row in payload.get(hint[2:], [])
                    ]
            return [payload]
        _validation_error(
            code="dataset_source_invalid_json",
            message="JSON dataset payload must decode to an object or array",
        )

    if source_type == "jsonl":
        text = _read_text_source(source_uri, source_config_jsonb)
        rows = []
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            payload = json.loads(stripped)
            rows.append(payload if isinstance(payload, dict) else {"value": payload})
        return rows

    if source_type == "huggingface":
        try:
            from datasets import load_dataset  # type: ignore
        except Exception as exc:  # pragma: no cover - environment-dependent
            _validation_error(
                code="dataset_source_loader_unavailable",
                message=f"Hugging Face dataset loading is unavailable: {exc}",
            )
        hf_path = str(source_config_jsonb.get("path") or source_uri or "")
        if not hf_path:
            _validation_error(
                code="dataset_source_missing",
                message="Hugging Face preview requires a dataset path",
                field_errors={"source_uri": "missing"},
            )
        dataset = load_dataset(
            path=hf_path,
            split=source_config_jsonb.get("split") or "train",
            name=source_config_jsonb.get("name"),
            data_dir=source_config_jsonb.get("data_dir"),
            revision=source_config_jsonb.get("revision"),
            trust_remote_code=bool(source_config_jsonb.get("trust", False)),
            **_as_dict(source_config_jsonb.get("extra_kwargs")),
        )
        return [dict(row) for row in dataset]

    _validation_error(
        code="dataset_source_type_unsupported",
        message=f"Unsupported dataset source type: {source_type}",
        field_errors={"source_type": source_type},
    )


def _path_lookup(row: dict[str, Any], spec: dict[str, Any] | None) -> Any:
    if not spec:
        return None
    path = spec.get("path")
    if not isinstance(path, str) or not path.startswith("$."):
        return None
    current: Any = row
    for part in path[2:].split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _normalize_sample(
    *,
    raw_row: dict[str, Any],
    field_spec_jsonb: dict[str, Any],
    sample_index: int,
    shuffle_choices: bool,
    rng: random.Random,
    auto_id: bool,
) -> dict[str, Any]:
    canonical: dict[str, Any] = {}
    for key in ("input", "messages", "choices", "target", "id", "metadata", "sandbox", "files", "setup"):
        mapped = _path_lookup(raw_row, _as_dict(field_spec_jsonb.get(key)))
        if mapped is None:
            mapped = raw_row.get(key)
        canonical[key] = mapped

    if canonical.get("id") in (None, "") and auto_id:
        canonical["id"] = f"sample-{sample_index + 1}"

    if not isinstance(canonical.get("metadata"), dict):
        canonical["metadata"] = {}
    if canonical.get("files") is not None and not isinstance(canonical.get("files"), list):
        canonical["files"] = [canonical["files"]]
    if canonical.get("choices") is not None and not isinstance(canonical.get("choices"), list):
        canonical["choices"] = [canonical["choices"]]
    if shuffle_choices and isinstance(canonical.get("choices"), list):
        shuffled = list(canonical["choices"])
        rng.shuffle(shuffled)
        canonical["choices"] = shuffled
    return canonical


def _sample_summary(canonical_sample: dict[str, Any]) -> dict[str, Any]:
    input_preview = canonical_sample.get("input")
    target_preview = canonical_sample.get("target")
    return {
        "input_preview": str(input_preview)[:160] if input_preview is not None else None,
        "target_preview": str(target_preview)[:160] if target_preview is not None else None,
        "choice_count": len(_as_list(canonical_sample.get("choices"))),
        "metadata_summary": _as_dict(canonical_sample.get("metadata")),
    }


def project_dataset_validation(*, canonical_samples: list[dict[str, Any]]) -> dict[str, Any]:
    duplicate_ids: dict[str, int] = {}
    missing_field_issues: list[dict[str, Any]] = []
    duplicate_id_issues: list[dict[str, Any]] = []
    unsupported_payload_issues: list[dict[str, Any]] = []

    for sample in canonical_samples:
        sample_id = sample.get("id")
        if isinstance(sample_id, str):
            duplicate_ids[sample_id] = duplicate_ids.get(sample_id, 0) + 1
        if sample.get("input") is None and not _as_list(sample.get("messages")):
            missing_field_issues.append({"sample_id": sample_id, "field": "input"})
        sandbox = sample.get("sandbox")
        if sandbox is not None and not isinstance(sandbox, dict):
            unsupported_payload_issues.append({"sample_id": sample_id, "field": "sandbox"})

    for sample_id, count in duplicate_ids.items():
        if count > 1:
            duplicate_id_issues.append({"sample_id": sample_id, "count": count})

    issue_groups = []
    if duplicate_id_issues:
        issue_groups.append(
            {
                "key": "duplicate_id",
                "label": "Duplicate sample ids",
                "count": len(duplicate_id_issues),
                "issues": duplicate_id_issues,
            }
        )
    if missing_field_issues:
        issue_groups.append(
            {
                "key": "missing_required_fields",
                "label": "Missing required fields",
                "count": len(missing_field_issues),
                "issues": missing_field_issues,
            }
        )
    if unsupported_payload_issues:
        issue_groups.append(
            {
                "key": "unsupported_payload",
                "label": "Unsupported payload fields",
                "count": len(unsupported_payload_issues),
                "issues": unsupported_payload_issues,
            }
        )

    warning_count = sum(group["count"] for group in issue_groups)
    return {
        "validation_status": "pass" if warning_count == 0 else "warn",
        "issue_groups": issue_groups,
        "warning_counts": {
            "warning_count": warning_count,
            "duplicate_id_count": len(duplicate_id_issues),
            "missing_field_count": len(missing_field_issues),
            "unsupported_payload_count": len(unsupported_payload_issues),
        },
        "generated_at": _now_iso(),
    }


def _field_resolution_summary(
    *, canonical_samples: list[dict[str, Any]], field_spec_jsonb: dict[str, Any]
) -> dict[str, Any]:
    resolved = []
    for key in ("input", "messages", "choices", "target", "id", "metadata", "sandbox", "files", "setup"):
        if field_spec_jsonb.get(key) and any(sample.get(key) not in (None, [], {}) for sample in canonical_samples):
            resolved.append(key)
    return {"resolved_fields": resolved}


def preview_dataset_source(
    *,
    source_type: str,
    source_uri: str | None,
    source_upload_id: str | None,
    source_config_jsonb: dict[str, Any] | None,
    field_spec_jsonb: dict[str, Any] | None,
    materialization_options_jsonb: dict[str, Any] | None,
) -> dict[str, Any]:
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.inspect.dataset.preview"):
        source_config = _as_dict(source_config_jsonb)
        field_spec = _as_dict(field_spec_jsonb)
        materialization_options = _as_dict(materialization_options_jsonb)

        raw_rows = _load_source_records(
            source_type=source_type,
            source_uri=source_uri,
            source_upload_id=source_upload_id,
            source_config_jsonb=source_config,
        )

        rng = random.Random(materialization_options.get("deterministic_seed"))
        rows = list(raw_rows)
        if materialization_options.get("shuffle"):
            rng.shuffle(rows)
        limit = materialization_options.get("limit")
        if isinstance(limit, int) and limit >= 0:
            rows = rows[:limit]

        canonical_samples = [
            _normalize_sample(
                raw_row=row,
                field_spec_jsonb=field_spec,
                sample_index=index,
                shuffle_choices=bool(materialization_options.get("shuffle_choices", False)),
                rng=rng,
                auto_id=bool(materialization_options.get("auto_id", True)),
            )
            for index, row in enumerate(rows)
        ]
        validation_summary = project_dataset_validation(canonical_samples=canonical_samples)
        field_resolution_summary = _field_resolution_summary(
            canonical_samples=canonical_samples,
            field_spec_jsonb=field_spec,
        )
        checksum = hashlib.sha256(
            json.dumps(canonical_samples, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()
        latency_ms = max(0, int((time.perf_counter() - start) * 1000))
        dataset_materialization_duration_ms.record(latency_ms, {"result": "preview"})
        return {
            "ok": True,
            "preview_id": f"preview-{checksum[:12]}",
            "sample_count": len(canonical_samples),
            "preview_samples": canonical_samples,
            "validation_summary": validation_summary,
            "field_resolution_summary": field_resolution_summary,
            "parse_summary_jsonb": {
                "field_resolution_summary": field_resolution_summary,
                "source_type": source_type,
            },
            "checksum": f"sha256:{checksum}",
            "canonical_samples": canonical_samples,
            "sample_rows": [
                {
                    "sample_id": str(sample.get("id") or f"sample-{index + 1}"),
                    "canonical_sample_jsonb": sample,
                    "summary_jsonb": _sample_summary(sample),
                    "metadata_jsonb": _as_dict(sample.get("metadata")),
                    "has_setup": sample.get("setup") is not None,
                    "has_sandbox": sample.get("sandbox") is not None,
                    "has_files": bool(_as_list(sample.get("files"))),
                    "parse_status": "ok",
                }
                for index, sample in enumerate(canonical_samples)
            ],
        }


def preview_dataset_draft(
    *,
    source_type: str,
    source_uri: str | None,
    source_upload_id: str | None,
    source_config_jsonb: dict[str, Any] | None,
    field_spec_jsonb: dict[str, Any] | None,
    materialization_options_jsonb: dict[str, Any] | None,
) -> dict[str, Any]:
    with tracer.start_as_current_span("agchain.inspect.dataset.draft.preview"):
        return preview_dataset_source(
            source_type=source_type,
            source_uri=source_uri,
            source_upload_id=source_upload_id,
            source_config_jsonb=source_config_jsonb,
            field_spec_jsonb=field_spec_jsonb,
            materialization_options_jsonb=materialization_options_jsonb,
        )

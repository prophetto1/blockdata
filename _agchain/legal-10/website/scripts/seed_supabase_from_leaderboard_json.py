from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    service_role_key: str


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required env var: {name}")
    return value


def _supabase_config() -> SupabaseConfig:
    url = _required_env("SUPABASE_URL").rstrip("/")
    service_role_key = _required_env("SUPABASE_SERVICE_ROLE_KEY")
    return SupabaseConfig(url=url, service_role_key=service_role_key)


def _headers(key: str, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _request_json(
    *,
    cfg: SupabaseConfig,
    method: str,
    path: str,
    params: dict[str, str] | None = None,
    payload: Any = None,
    prefer: str | None = None,
) -> Any:
    url = f"{cfg.url}/rest/v1/{path.lstrip('/')}"
    res = requests.request(
        method=method,
        url=url,
        params=params,
        json=payload,
        headers=_headers(cfg.service_role_key, prefer=prefer),
        timeout=30,
    )
    if not res.ok:
        raise RuntimeError(f"{method} {url} failed ({res.status_code}): {res.text}")
    if not res.text:
        return None
    return res.json()


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _upsert_model(cfg: SupabaseConfig, model: dict[str, Any]) -> str:
    rows = _request_json(
        cfg=cfg,
        method="POST",
        path="models",
        params={"on_conflict": "name,provider"},
        payload=[model],
        prefer="resolution=merge-duplicates,return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Upsert model returned no rows")
    model_id = rows[0].get("id")
    if not model_id:
        raise RuntimeError("Upsert model did not return id")
    return str(model_id)


def _insert_run(cfg: SupabaseConfig, run: dict[str, Any]) -> str:
    rows = _request_json(
        cfg=cfg,
        method="POST",
        path="runs",
        payload=[run],
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Insert run returned no rows")
    run_id = rows[0].get("id")
    if not run_id:
        raise RuntimeError("Insert run did not return id")
    return str(run_id)


def _insert_run_scores(cfg: SupabaseConfig, scores: dict[str, Any]) -> None:
    _request_json(
        cfg=cfg,
        method="POST",
        path="run_scores",
        payload=[scores],
        prefer="return=representation",
    )


def _publish_run(cfg: SupabaseConfig, run_id: str) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    _request_json(
        cfg=cfg,
        method="PATCH",
        path="runs",
        params={"id": f"eq.{run_id}"},
        payload={"status": "published", "published_at": now_iso},
        prefer="return=representation",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed Supabase tables from public/data/leaderboard-v2.sample.json"
    )
    parser.add_argument(
        "--json",
        default="public/data/leaderboard-v2.sample.json",
        help="Path to leaderboard JSON file",
    )
    parser.add_argument("--benchmark-version", default=None)
    parser.add_argument("--dataset-version", default=None)
    parser.add_argument("--limit-models", type=int, default=None)
    args = parser.parse_args()

    cfg = _supabase_config()
    src = Path(args.json)
    data = json.loads(src.read_text(encoding="utf-8"))

    benchmark_version = args.benchmark_version or data.get("benchmark_version") or "unknown"
    dataset_version = args.dataset_version or data.get("dataset_version") or "unknown"
    spec_hash = str(data.get("run_id") or f"seed:{src.name}")

    models = data.get("models")
    if not isinstance(models, list) or not models:
        raise SystemExit("No models[] found in leaderboard JSON.")

    if args.limit_models:
        models = models[: args.limit_models]

    for m in models:
        if not isinstance(m, dict):
            continue

        model_payload = {
            "name": m.get("model"),
            "provider": m.get("provider"),
            "api_model_id": m.get("model_id"),
            "parameters": m.get("parameters"),
            "context_window": m.get("context_window"),
            "quantization": m.get("quantization"),
            "release_date": m.get("release_date") or None,
        }

        model_uuid = _upsert_model(cfg, model_payload)

        run_payload = {
            "model_id": model_uuid,
            "benchmark_version": benchmark_version,
            "dataset_version": dataset_version,
            "spec_hash": spec_hash,
            "langfuse_trace_id": None,
            "status": "draft",
            "metadata": {
                "tier": data.get("tier"),
                "total_instances": data.get("total_instances"),
                "updated_at": data.get("updated_at"),
                "milestones_complete": _as_int(m.get("milestones_complete")),
                "milestones_total": _as_int(m.get("milestones_total")),
                "avg_latency_ms": _as_float(m.get("avg_latency_ms")),
                "cost_per_instance": _as_float(m.get("cost_per_instance")),
            },
        }
        run_uuid = _insert_run(cfg, run_payload)

        score_payload = {
            "run_id": run_uuid,
            "s1": _as_float(m.get("s1")),
            "s3_consistency": _as_float(m.get("s3_consistency")),
            "s4_disposition": _as_float(m.get("s4_disposition")),
            "s5_cb": _as_float(m.get("s5_cb")),
            "s5_rag": _as_float(m.get("s5_rag")),
            "s6": _as_float(m.get("s6")),
            "s7": _as_float(m.get("s7")),
            "s8_pass_rate": _as_float(m.get("s8_pass_rate")),
            "chain_score": _as_float(m.get("chain")),
            "voided": False,
        }
        _insert_run_scores(cfg, score_payload)
        _publish_run(cfg, run_uuid)

        print(f"Published: {model_payload['name']} ({model_payload['provider']}) -> run {run_uuid}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


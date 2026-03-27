"""
Export DuckDB tables/views to Parquet files for Databricks upload.

Defaults:
  DB:      legal-10/datasets/legal10-updates.duckdb
  Output:  legal-10/datasets/parquet/<export_id>/
    - tables/main.<table>.parquet
    - views/main.<view>.parquet
    - manifest.json (row counts, columns, failures, etc.)
    - README.md (upload + ingestion tips)
"""

from __future__ import annotations

import argparse
import json
import hashlib
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from getpass import getuser
from pathlib import Path
from typing import Any

import duckdb


PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_DB_PATH = PROJECT_ROOT / "datasets" / "legal10-updates.duckdb"
DEFAULT_OUT_ROOT = PROJECT_ROOT / "datasets" / "parquet"
DEFAULT_COMPRESSION = "ZSTD"
DEFAULT_INVOCATION_LOG = DEFAULT_OUT_ROOT / "_duckdb_export_invocations.jsonl"

EXTRAS_PROFILE_CHOICES = ("none", "synthetic", "fdq_required", "all")

# Minimal synthetic trap lists (DATA-F7).
EXTRAS_SYNTHETIC_FILES: tuple[str, ...] = (
    "fake_cases.csv",
    "fake_cases_manifest.json",
    "fake_cap_cases.csv",
    "fake_cap_cases_manifest.json",
)

# Files required (directly or indirectly) by the core Legal-10 build pipeline inputs
# documented in `legal-10/docs/[C] datasets-implications.md` and
# `legal-10/docs/[C] data-pipeline-reference.md`.
#
# Goal: include enough artifacts to reproduce/inspect all required FDQs in Databricks,
# without forcing the 1GB+ CAP corpora by default.
EXTRAS_FDQ_REQUIRED_FILES: tuple[str, ...] = (
    # Anchor corpus (DATA-F1)
    "scdb_full_with_text.jsonl",
    # Citation inventory foundation (DATA-F2)
    "citation_inventory.parquet",
    # Canary labels (DATA-F5)
    "citation_depth_labels.parquet",
    # RP assembly inputs (Stage 4A)
    "casesumm_syllabi.parquet",
    "cap_head_matter.jsonl",
    # Pre-ranked citations for RP selection (DATA-F6)
    "scotus_citations_ranked.jsonl",
    "cap_citations_ranked.jsonl",
    # Eligibility/K-rule stats
    "anchor_citation_counts.jsonl",
    # Resolution maps used by build stages
    "scotus_to_cap_map.jsonl",
    "scotus_to_scotus_map.parquet",
    "scotus_to_scotus_map.jsonl",
    # CAP byte index (useful for CAP extraction/verification)
    "cap_byte_index.parquet",
    # Synthetic traps (DATA-F7)
    *EXTRAS_SYNTHETIC_FILES,
)


def _utc_now_compact() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _as_duckdb_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _try_get_git_metadata(repo_root: Path) -> dict[str, Any]:
    """
    Best-effort git metadata for debugging unexpected repeated exports.
    Never raises.
    """
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        head = (commit.stdout or "").strip() if commit.returncode == 0 else None

        dirty = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        is_dirty = bool((dirty.stdout or "").strip()) if dirty.returncode == 0 else None

        return {"head": head, "is_dirty": is_dirty}
    except Exception:  # noqa: BLE001
        return {"head": None, "is_dirty": None}


def _collect_invocation_metadata(
    *,
    args: argparse.Namespace | None,
    resolved_export_id: str | None,
) -> dict[str, Any]:
    md: dict[str, Any] = {
        "started_utc": _utc_now_iso(),
        "argv": list(sys.argv),
        "cwd": os.getcwd(),
        "project_root": str(PROJECT_ROOT.resolve()),
        "user": getuser(),
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
        "python": sys.version,
        "platform": platform.platform(),
        "git": _try_get_git_metadata(PROJECT_ROOT),
        "resolved_export_id": resolved_export_id,
    }

    if args is not None:
        md["settings"] = {
            "db_path": str(args.db_path),
            "out_root": str(args.out_root),
            "compression": args.compression,
            "include_views": not args.no_views,
            "extras_profile": args.extras_profile,
            "extras_convert_max_mb": args.extras_convert_max_mb,
            "with_row_counts": not args.no_row_counts,
            "fail_fast": args.fail_fast,
            "only_filters": list(args.only),
            "timestamped": bool(args.timestamped),
            "export_id_arg": (args.export_id or "").strip(),
        }

    return md


def _append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def _copy_file_streaming(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    # copy2 preserves mtime which can be useful for audits; it streams internally.
    shutil.copy2(src, dst)


def _query_rows(con: duckdb.DuckDBPyConnection, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
    cur = con.execute(sql, params or [])
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _matches_any(value: str, needles: list[str]) -> bool:
    if not needles:
        return True
    low = value.lower()
    return any(n.lower() in low for n in needles)


def _safe_unlink(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass


def _copy_query_to_parquet(
    con: duckdb.DuckDBPyConnection,
    query_sql: str,
    out_file: Path,
    compression: str,
) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = out_file.with_suffix(out_file.suffix + ".tmp")
    _safe_unlink(tmp_file)
    _safe_unlink(out_file)

    out_path = _as_duckdb_path(tmp_file)
    sql = f"COPY ({query_sql}) TO '{out_path}' (FORMAT PARQUET, COMPRESSION {compression})"
    con.execute(sql)

    tmp_file.replace(out_file)


def _count_rows(con: duckdb.DuckDBPyConnection, query_sql: str) -> int:
    return int(con.execute(f"SELECT COUNT(*) FROM ({query_sql}) q").fetchone()[0])


_READ_FILE_CALL_RE = re.compile(r"""(?is)\b(read_[a-zA-Z0-9_]+)\s*\(\s*(['"])([^'"]+)\2""")


def _rewrite_read_paths(sql: str, datasets_dir: Path) -> tuple[str, list[dict[str, Any]]]:
    """
    Rewrite read_*('.../datasets/<file>') paths to the local repo datasets directory when possible.
    Returns (rewritten_sql, dependency_records).
    """

    dependencies: list[dict[str, Any]] = []

    def repl(match: re.Match[str]) -> str:
        fn = match.group(1)
        quote = match.group(2)
        raw_path = match.group(3) or ""
        file_name = Path(raw_path).name
        candidate = datasets_dir / file_name

        rewritten_path: str | None = None
        if file_name and candidate.exists():
            rewritten_path = _as_duckdb_path(candidate)

        dep = {
            "function": fn,
            "raw_path": raw_path,
            "file_name": file_name,
            "resolved_path": rewritten_path,
            "resolved_exists": bool(rewritten_path),
        }
        dependencies.append(dep)

        final_path = rewritten_path or raw_path
        return f"{fn}({quote}{final_path}{quote}"

    rewritten = _READ_FILE_CALL_RE.sub(repl, sql)
    return rewritten, dependencies


@dataclass(frozen=True)
class ViewDef:
    schema: str
    name: str
    create_sql: str
    body_sql: str
    body_sql_rewritten: str
    dependencies: list[dict[str, Any]]


def _extract_view_body(create_sql: str) -> str:
    sql = create_sql.strip().rstrip(";")
    m = re.match(r"(?is)^create\s+view\s+.*?\s+as\s+(.*)$", sql)
    if not m:
        raise ValueError(f"Unexpected view SQL format: {create_sql[:80]}...")
    return m.group(1).strip()


def _build_view_dependency_graph(view_defs: dict[str, ViewDef]) -> dict[str, set[str]]:
    names = list(view_defs.keys())
    graph: dict[str, set[str]] = {n: set() for n in names}
    for view_name, view_def in view_defs.items():
        body = view_def.body_sql_rewritten
        for other in names:
            if other == view_name:
                continue
            if re.search(rf"(?i)\\b{re.escape(other)}\\b", body):
                graph[view_name].add(other)
    return graph


def _topo_order_subset(graph: dict[str, set[str]], subset: set[str]) -> list[str]:
    in_deg: dict[str, int] = {n: 0 for n in subset}
    for n in subset:
        for dep in graph[n]:
            if dep in subset:
                in_deg[n] += 1

    q = deque([n for n, d in in_deg.items() if d == 0])
    out: list[str] = []
    while q:
        n = q.popleft()
        out.append(n)
        for child in subset:
            if n in graph[child]:
                in_deg[child] -= 1
                if in_deg[child] == 0:
                    q.append(child)

    if len(out) != len(subset):
        cycle = sorted(subset - set(out))
        raise ValueError(f"Cycle detected in view dependencies: {cycle}")

    return out


def _dependency_closure(graph: dict[str, set[str]], start: str) -> set[str]:
    seen: set[str] = set()
    stack = [start]
    while stack:
        n = stack.pop()
        if n in seen:
            continue
        seen.add(n)
        stack.extend(graph[n])
    return seen


def _render_view_query(view_defs: dict[str, ViewDef], graph: dict[str, set[str]], target: str) -> str:
    closure = _dependency_closure(graph, target)
    order = _topo_order_subset(graph, closure)

    ctes: list[str] = []
    for name in order:
        body = view_defs[name].body_sql_rewritten
        ctes.append(f"{name} AS ({body})")

    with_clause = "WITH " + ",\n     ".join(ctes)
    return f"{with_clause}\nSELECT * FROM {target}"


def _columns_for_object(con: duckdb.DuckDBPyConnection, schema: str, name: str) -> list[dict[str, Any]]:
    rows = _query_rows(
        con,
        """
        select
          column_name,
          column_index,
          data_type,
          is_nullable,
          column_default
        from duckdb_columns()
        where schema_name = ?
          and table_name = ?
        order by column_index
        """,
        [schema, name],
    )
    return [
        {
            "column_name": r["column_name"],
            "column_index": r["column_index"],
            "data_type": r["data_type"],
            "is_nullable": r["is_nullable"],
            "column_default": r["column_default"],
        }
        for r in rows
    ]


def _build_run_readme(export_id: str, out_dir: Path) -> str:
    rel = out_dir.as_posix()
    return f"""# DuckDB → Parquet export for Databricks

Export ID: `{export_id}`
Generated (UTC): `{_utc_now_iso()}`
Folder: `{rel}`

## What’s inside
- `tables/`: one Parquet file per DuckDB base table
- `views/`: one Parquet file per DuckDB view (materialized)
- `extras/`: pipeline datasets (raw copies + optional Parquet conversions)
- `manifest.json`: counts, schemas, failures, and view SQL

## Databricks upload (DBFS FileStore example)
If you use the legacy CLI (`databricks-cli`):

1. Configure:
   - `databricks configure --token`

2. Upload this export directory:
   - `databricks fs cp -r {rel} dbfs:/FileStore/legal10_parquet/{export_id}/`

3. Verify:
   - `databricks fs ls dbfs:/FileStore/legal10_parquet/{export_id}/tables`

## Databricks read example (notebook)
```python
df = spark.read.parquet("dbfs:/FileStore/legal10_parquet/{export_id}/tables/main.scdb_cases.parquet")
display(df.limit(20))
```

## Next step (recommended)
Write Delta tables from these Parquet sources once you’ve validated schemas in Databricks.
"""

def _iter_dataset_files(datasets_dir: Path, profile: str) -> Iterable[Path]:
    if profile == "none":
        return []
    if profile == "synthetic":
        return [datasets_dir / n for n in EXTRAS_SYNTHETIC_FILES]
    if profile == "fdq_required":
        # Include explicitly required artifacts + all top-level SQL recipes
        # (useful for reproducibility/auditing, even if SQL is DuckDB-specific).
        explicit = [datasets_dir / n for n in EXTRAS_FDQ_REQUIRED_FILES]
        sql_recipes = [p for p in datasets_dir.iterdir() if p.is_file() and p.suffix.lower() == ".sql"]
        unique: dict[str, Path] = {}
        for p in [*explicit, *sql_recipes]:
            unique[p.name.lower()] = p
        return list(unique.values())
    if profile == "all":
        # Everything in datasets/ (flat), excluding the DuckDB itself.
        return [
            p
            for p in datasets_dir.iterdir()
            if p.is_file() and p.name.lower() != "legal10-updates.duckdb"
        ]
    raise ValueError(f"Unknown extras profile: {profile}")


def _export_extras(
    *,
    con: duckdb.DuckDBPyConnection,
    out_dir: Path,
    compression: str,
    datasets_dir: Path,
    extras_profile: str,
    convert_max_bytes: int,
    only_filters: list[str],
    with_row_counts: bool,
) -> list[dict[str, Any]]:
    extras_dir = out_dir / "extras"
    extras_raw_dir = extras_dir / "raw"
    extras_parquet_dir = extras_dir / "parquet"

    extras: list[dict[str, Any]] = []
    for src in _iter_dataset_files(datasets_dir, profile=extras_profile):
        name = src.name
        if only_filters and not (_matches_any(name, only_filters) or _matches_any(src.as_posix(), only_filters)):
            continue

        if not src.exists():
            # If the canonical fake-case manifest JSONs are missing in datasets/,
            # generate a minimal manifest into this export so downstream consumers
            # still have count + sha256 for integrity.
            if name in ("fake_cases_manifest.json", "fake_cap_cases_manifest.json"):
                csv_name = "fake_cases.csv" if name.startswith("fake_cases") else "fake_cap_cases.csv"
                csv_src = datasets_dir / csv_name
                if csv_src.exists():
                    dst = extras_raw_dir / name
                    sha = _sha256_file(csv_src)
                    # Count rows (excluding header) with a cheap line count.
                    # CSVs are small (<= ~50KB) in this repo.
                    row_count = max(0, len(csv_src.read_text(encoding="utf-8").splitlines()) - 1)
                    minimal = {
                        "seed": None,
                        "count": row_count,
                        "output_sha256": sha,
                        "note": "Generated by export script because source manifest was missing in datasets/.",
                    }
                    _write_json(dst, minimal)
                    extras.append(
                        {
                            "name": name,
                            "source_file": str(src),
                            "copied_file": str(dst),
                            "sha256": _sha256_file(dst),
                            "file_size_bytes": dst.stat().st_size,
                            "status": "generated",
                            "error": None,
                        }
                    )
                    continue

            extras.append({"name": name, "source_file": str(src), "status": "missing", "error": "source file not found"})
            continue

        dst = extras_raw_dir / name
        _copy_file_streaming(src, dst)

        entry: dict[str, Any] = {
            "name": name,
            "source_file": str(src),
            "copied_file": str(dst),
            "sha256": _sha256_file(dst),
            "file_size_bytes": dst.stat().st_size,
            "as_parquet": None,
            "row_count": None,
            "columns": None,
            "status": "copied",
            "error": None,
        }

        # Convert small-enough CSV/JSONL to Parquet for Databricks convenience.
        should_convert = dst.stat().st_size <= convert_max_bytes
        if should_convert and name.lower().endswith(".csv"):
            parquet_out = extras_parquet_dir / f"{Path(name).stem}.parquet"
            query_sql = f"SELECT * FROM read_csv_auto('{_as_duckdb_path(src)}', header=true)"
            try:
                if with_row_counts:
                    entry["row_count"] = _count_rows(con, query_sql)
                _copy_query_to_parquet(con, query_sql=query_sql, out_file=parquet_out, compression=compression)
                entry["as_parquet"] = str(parquet_out)
                entry["columns"] = [r[0] for r in con.execute("DESCRIBE " + query_sql).fetchall()]
                entry["status"] = "success"
            except Exception as e:  # noqa: BLE001
                entry["status"] = "failure"
                entry["error"] = str(e)
        elif should_convert and name.lower().endswith(".jsonl"):
            parquet_out = extras_parquet_dir / f"{Path(name).stem}.parquet"
            query_sql = f"SELECT * FROM read_json_auto('{_as_duckdb_path(src)}')"
            try:
                if with_row_counts:
                    entry["row_count"] = _count_rows(con, query_sql)
                _copy_query_to_parquet(con, query_sql=query_sql, out_file=parquet_out, compression=compression)
                entry["as_parquet"] = str(parquet_out)
                entry["columns"] = [r[0] for r in con.execute("DESCRIBE " + query_sql).fetchall()]
                entry["status"] = "success"
            except Exception as e:  # noqa: BLE001
                entry["status"] = "failure"
                entry["error"] = str(e)

        extras.append(entry)

    return extras


def export_all(
    db_path: Path,
    out_root: Path,
    export_id: str,
    compression: str,
    include_views: bool,
    extras_profile: str,
    extras_convert_max_mb: int,
    with_row_counts: bool,
    fail_fast: bool,
    only_filters: list[str],
    invocation_metadata: dict[str, Any] | None = None,
) -> Path:
    if not db_path.exists():
        raise FileNotFoundError(str(db_path))

    out_dir = out_root / export_id
    tables_dir = out_dir / "tables"
    views_dir = out_dir / "views"
    datasets_dir = PROJECT_ROOT / "datasets"

    con = duckdb.connect(str(db_path), read_only=True)
    try:
        duckdb_version = str(con.execute("select version()").fetchone()[0])

        tables = _query_rows(
            con,
            """
            select schema_name, table_name
            from duckdb_tables()
            where internal = false and temporary = false
            order by schema_name, table_name
            """,
        )
        table_objs = [(t["schema_name"], t["table_name"]) for t in tables]

        view_defs: dict[str, ViewDef] = {}
        if include_views:
            views = _query_rows(
                con,
                """
                select schema_name, view_name, sql
                from duckdb_views()
                where internal = false and temporary = false
                order by schema_name, view_name
                """,
            )
            datasets_dir = PROJECT_ROOT / "datasets"
            for v in views:
                schema = v["schema_name"]
                name = v["view_name"]
                create_sql = v["sql"] or ""
                body = _extract_view_body(create_sql)
                rewritten, deps = _rewrite_read_paths(body, datasets_dir=datasets_dir)
                view_defs[name] = ViewDef(
                    schema=schema,
                    name=name,
                    create_sql=create_sql,
                    body_sql=body,
                    body_sql_rewritten=rewritten,
                    dependencies=deps,
                )

        view_graph = _build_view_dependency_graph(view_defs) if view_defs else {}

        manifest: dict[str, Any] = {
            "invocation": invocation_metadata or {},
            "database": {
                "db_path": str(db_path),
                "db_size_bytes": db_path.stat().st_size,
                "duckdb_version": duckdb_version,
                "export_id": export_id,
                "export_time_utc": _utc_now_iso(),
            },
            "export": {
                "out_dir": str(out_dir),
                "compression": compression,
                "include_views": include_views,
                "extras_profile": extras_profile,
                "extras_convert_max_mb": extras_convert_max_mb,
                "with_row_counts": with_row_counts,
                "fail_fast": fail_fast,
                "only_filters": only_filters,
            },
            "objects": [],
            "extras": [],
            "summary": {
                "tables_discovered": len(table_objs),
                "views_discovered": len(view_defs),
                "objects_exported": 0,
                "objects_failed": 0,
            },
        }

        def record(obj: dict[str, Any]) -> None:
            manifest["objects"].append(obj)
            manifest["summary"]["objects_exported"] += 1
            if obj["status"] != "success":
                manifest["summary"]["objects_failed"] += 1

        # Tables
        for schema, name in table_objs:
            fqn = f"{schema}.{name}"
            if not _matches_any(fqn, only_filters) and not _matches_any(name, only_filters):
                continue

            out_file = tables_dir / f"{fqn}.parquet"
            query_sql = f"SELECT * FROM {schema}.{name}"

            obj: dict[str, Any] = {
                "object_type": "table",
                "schema": schema,
                "name": name,
                "fqn": fqn,
                "out_file": str(out_file),
                "status": "pending",
                "row_count": None,
                "file_size_bytes": None,
                "columns": _columns_for_object(con, schema, name),
                "error": None,
            }

            try:
                if with_row_counts:
                    obj["row_count"] = _count_rows(con, query_sql)
                _copy_query_to_parquet(con, query_sql=query_sql, out_file=out_file, compression=compression)
                obj["file_size_bytes"] = out_file.stat().st_size
                obj["status"] = "success"
            except Exception as e:  # noqa: BLE001
                obj["status"] = "failure"
                obj["error"] = str(e)
                if fail_fast:
                    record(obj)
                    raise
            record(obj)

        # Views
        if include_views and view_defs:
            for name, view_def in view_defs.items():
                fqn = f"{view_def.schema}.{name}"
                if not _matches_any(fqn, only_filters) and not _matches_any(name, only_filters):
                    continue

                out_file = views_dir / f"{fqn}.parquet"
                query_sql = _render_view_query(view_defs, view_graph, target=name)

                obj = {
                    "object_type": "view",
                    "schema": view_def.schema,
                    "name": name,
                    "fqn": fqn,
                    "out_file": str(out_file),
                    "status": "pending",
                    "row_count": None,
                    "file_size_bytes": None,
                    "columns": _columns_for_object(con, view_def.schema, name),
                    "create_sql": view_def.create_sql,
                    "body_sql_rewritten": view_def.body_sql_rewritten,
                    "dependencies": view_def.dependencies,
                    "view_depends_on": sorted(view_graph.get(name, set())),
                    "error": None,
                }

                try:
                    if with_row_counts:
                        obj["row_count"] = _count_rows(con, query_sql)
                    _copy_query_to_parquet(con, query_sql=query_sql, out_file=out_file, compression=compression)
                    obj["file_size_bytes"] = out_file.stat().st_size
                    obj["status"] = "success"
                except Exception as e:  # noqa: BLE001
                    obj["status"] = "failure"
                    obj["error"] = str(e)
                    if fail_fast:
                        record(obj)
                        raise
                record(obj)

        # Extras (pipeline datasets)
        if extras_profile != "none":
            manifest["extras"] = _export_extras(
                con=con,
                out_dir=out_dir,
                compression=compression,
                datasets_dir=datasets_dir,
                extras_profile=extras_profile,
                convert_max_bytes=extras_convert_max_mb * 1024 * 1024,
                only_filters=only_filters,
                with_row_counts=with_row_counts,
            )

        _write_text(out_dir / "README.md", _build_run_readme(export_id, out_dir))
        _write_json(out_dir / "manifest.json", manifest)
        return out_dir
    finally:
        con.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Export DuckDB tables/views to Parquet for Databricks upload.")
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH, help="Path to .duckdb database file")
    parser.add_argument(
        "--out-root",
        type=Path,
        default=DEFAULT_OUT_ROOT,
        help="Root directory where export runs will be created",
    )
    parser.add_argument("--export-id", type=str, default="", help="Export ID subfolder name (required unless --timestamped)")
    parser.add_argument(
        "--timestamped",
        action="store_true",
        help="If --export-id is omitted, generate a timestamped '<utc>_duckdb_export' folder",
    )
    parser.add_argument(
        "--invocation-log",
        type=Path,
        default=DEFAULT_INVOCATION_LOG,
        help="Append JSONL invocation records here (useful for tracking unexpected runs)",
    )
    parser.add_argument("--no-invocation-log", action="store_true", help="Disable invocation JSONL logging")
    parser.add_argument(
        "--compression",
        type=str,
        default=DEFAULT_COMPRESSION,
        help="Parquet compression codec (e.g., ZSTD, SNAPPY)",
    )
    parser.add_argument("--no-views", action="store_true", help="Export tables only (skip views)")
    parser.add_argument(
        "--extras-profile",
        type=str,
        default="none",
        choices=EXTRAS_PROFILE_CHOICES,
        help="Which extra pipeline datasets to include under extras/",
    )
    parser.add_argument(
        "--extras-convert-max-mb",
        type=int,
        default=200,
        help="Convert CSV/JSONL to Parquet in extras/ only if file size is <= this threshold (MB)",
    )
    parser.add_argument("--no-row-counts", action="store_true", help="Skip COUNT(*) verification counts")
    parser.add_argument("--fail-fast", action="store_true", help="Stop on first failure")
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Only export objects whose name/FQN contains this substring (repeatable)",
    )
    args = parser.parse_args()

    export_id = (args.export_id or "").strip()
    resolved_export_id: str | None = None
    if export_id:
        resolved_export_id = export_id
    elif args.timestamped:
        resolved_export_id = f"{_utc_now_compact()}_duckdb_export"

    invocation_md = _collect_invocation_metadata(args=args, resolved_export_id=resolved_export_id)
    if not args.no_invocation_log:
        _append_jsonl(args.invocation_log, invocation_md)

    if not resolved_export_id:
        print(
            "ERROR: Refusing to run without an explicit export id.\n"
            "Pass `--export-id <name>` for a stable output folder, or pass `--timestamped` to create a new timestamped export.",
            file=sys.stderr,
        )
        return 2

    out_dir = export_all(
        db_path=args.db_path,
        out_root=args.out_root,
        export_id=resolved_export_id,
        compression=args.compression,
        include_views=not args.no_views,
        extras_profile=args.extras_profile,
        extras_convert_max_mb=args.extras_convert_max_mb,
        with_row_counts=not args.no_row_counts,
        fail_fast=args.fail_fast,
        only_filters=args.only,
        invocation_metadata=invocation_md,
    )

    print(f"Export complete: {out_dir}")
    print(f"Manifest: {out_dir / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

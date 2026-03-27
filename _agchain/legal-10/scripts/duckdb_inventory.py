"""
DuckDB inventory: tables, views, columns, indexes, and external file dependencies.

Default target DB:
  legal-10/datasets/legal10-updates.duckdb

Outputs (by default):
  legal-10/datasets/duckdb_inventory.json
  legal-10/datasets/duckdb_inventory.md
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import duckdb


PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_DB_PATH = PROJECT_ROOT / "datasets" / "legal10-updates.duckdb"
DEFAULT_JSON_OUT = PROJECT_ROOT / "datasets" / "duckdb_inventory.json"
DEFAULT_MD_OUT = PROJECT_ROOT / "datasets" / "duckdb_inventory.md"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _query(con: duckdb.DuckDBPyConnection, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
    cursor = con.execute(sql, params or [])
    columns = [d[0] for d in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


_READ_FILE_CALL_RE = re.compile(
    r"""\bread_[a-zA-Z0-9_]+\s*\(\s*(?:'([^']+)'|"([^"]+)")""",
    re.IGNORECASE,
)


def _extract_external_paths(sql: str) -> list[str]:
    paths: list[str] = []
    for match in _READ_FILE_CALL_RE.finditer(sql or ""):
        paths.append(match.group(1) or match.group(2))
    return paths


@dataclass(frozen=True)
class ExternalDependency:
    raw_path: str
    exists: bool


def _format_bool(value: Any) -> str:
    if value is True:
        return "yes"
    if value is False:
        return "no"
    return "?"


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _write_md(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    db = payload["database"]
    tables = payload["tables"]
    views = payload["views"]
    indexes = payload["indexes"]

    lines: list[str] = []
    lines.append("# DuckDB inventory")
    lines.append("")
    lines.append("## Database")
    lines.append(f"- File: `{db['file_path']}`")
    lines.append(f"- DuckDB engine: `{db['duckdb_engine_version']}`")
    lines.append(f"- File size: `{db['file_size_bytes']:,}` bytes")
    lines.append(f"- Last modified: `{db['file_last_modified_utc']}`")
    lines.append(f"- Snapshot (UTC): `{db['snapshot_utc']}`")
    lines.append("")

    lines.append("## Schemas")
    for s in payload["schemas"]:
        lines.append(f"- `{s['database_name']}.{s['schema_name']}` (internal={_format_bool(s['internal'])})")
    lines.append("")

    lines.append("## Tables")
    for t in tables:
        lines.append(
            f"- `{t['schema_name']}.{t['table_name']}`"
            f" (rows~{t['estimated_rows']:,}, cols={t['column_count']}, pk={_format_bool(t['has_primary_key'])}, indexes={t['index_count']})"
        )
    lines.append("")

    lines.append("## Views")
    for v in views:
        deps = v.get("external_dependencies", [])
        dep_summary = ""
        if deps:
            ok = sum(1 for d in deps if d["exists"])
            dep_summary = f" [external files: {ok}/{len(deps)} exist]"
        lines.append(f"- `{v['schema_name']}.{v['view_name']}` (cols={v['column_count']}){dep_summary}")
    lines.append("")

    lines.append("## Indexes")
    if not indexes:
        lines.append("- (none)")
    else:
        for idx in indexes:
            lines.append(
                f"- `{idx['schema_name']}.{idx['index_name']}` on `{idx['table_name']}`"
                f" (unique={_format_bool(idx['is_unique'])}, primary={_format_bool(idx['is_primary'])})"
                f" expr={idx['expressions']}"
            )
    lines.append("")

    lines.append("## Columns (tables)")
    for t in tables:
        cols = t.get("columns", [])
        lines.append(f"### {t['schema_name']}.{t['table_name']}")
        for c in cols:
            default = f" default={c['column_default']}" if c.get("column_default") is not None else ""
            lines.append(f"- `{c['column_name']}`: `{c['data_type']}` (nullable={_format_bool(c['is_nullable'])}){default}")
        lines.append("")

    lines.append("## Columns (views)")
    for v in views:
        cols = v.get("columns", [])
        lines.append(f"### {v['schema_name']}.{v['view_name']}")
        for c in cols:
            default = f" default={c['column_default']}" if c.get("column_default") is not None else ""
            lines.append(f"- `{c['column_name']}`: `{c['data_type']}` (nullable={_format_bool(c['is_nullable'])}){default}")
        lines.append("")

    lines.append("## View SQL + external dependencies")
    for v in views:
        lines.append(f"### {v['schema_name']}.{v['view_name']}")
        if v.get("external_dependencies"):
            lines.append("- External files:")
            for dep in v["external_dependencies"]:
                status = "OK" if dep["exists"] else "MISSING"
                lines.append(f"  - {status}: `{dep['raw_path']}`")
        else:
            lines.append("- External files: (none detected)")
        lines.append("")
        lines.append("```sql")
        lines.append(v["sql"] or "")
        lines.append("```")
        lines.append("")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def build_inventory(db_path: Path) -> dict[str, Any]:
    if not db_path.exists():
        raise FileNotFoundError(str(db_path))

    con = duckdb.connect(str(db_path), read_only=True)
    try:
        version_row = _query(con, "select version() as duckdb_version")
        duckdb_version = version_row[0]["duckdb_version"] if version_row else "unknown"

        schemas = _query(con, "select database_name, schema_name, internal from duckdb_schemas() order by database_name, schema_name")

        tables = _query(
            con,
            """
            select
              database_name,
              schema_name,
              table_name,
              has_primary_key,
              estimated_size as estimated_rows,
              column_count,
              index_count,
              sql
            from duckdb_tables()
            where internal = false
              and temporary = false
            order by schema_name, table_name
            """,
        )

        views = _query(
            con,
            """
            select
              database_name,
              schema_name,
              view_name,
              column_count,
              sql
            from duckdb_views()
            where internal = false
              and temporary = false
            order by schema_name, view_name
            """,
        )

        indexes = _query(
            con,
            """
            select
              schema_name,
              table_name,
              index_name,
              is_unique,
              is_primary,
              expressions,
              sql
            from duckdb_indexes()
            order by schema_name, table_name, index_name
            """,
        )

        columns = _query(
            con,
            """
            select
              database_name,
              schema_name,
              table_name,
              column_name,
              column_index,
              data_type,
              is_nullable,
              column_default
            from duckdb_columns()
            where schema_name not in ('pg_catalog', 'information_schema')
              and database_name != 'temp'
            order by schema_name, table_name, column_index
            """,
        )

        columns_by_object: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for c in columns:
            key = (c["schema_name"], c["table_name"])
            columns_by_object[key].append(
                {
                    "column_name": c["column_name"],
                    "column_index": c["column_index"],
                    "data_type": c["data_type"],
                    "is_nullable": c["is_nullable"],
                    "column_default": c["column_default"],
                }
            )

        for t in tables:
            t["columns"] = columns_by_object.get((t["schema_name"], t["table_name"]), [])

        for v in views:
            v["columns"] = columns_by_object.get((v["schema_name"], v["view_name"]), [])
            external_paths = _extract_external_paths(v.get("sql") or "")
            deps: list[ExternalDependency] = []
            for p in external_paths:
                try:
                    exists = Path(p).exists()
                except OSError:
                    exists = False
                deps.append(ExternalDependency(raw_path=p, exists=exists))
            v["external_dependencies"] = [{"raw_path": d.raw_path, "exists": d.exists} for d in deps]

        stat = db_path.stat()
        inventory: dict[str, Any] = {
            "database": {
                "file_path": str(db_path),
                "file_size_bytes": stat.st_size,
                "file_last_modified_utc": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                .replace(microsecond=0)
                .isoformat(),
                "snapshot_utc": _utc_now_iso(),
                "duckdb_engine_version": duckdb_version,
            },
            "schemas": schemas,
            "tables": tables,
            "views": views,
            "indexes": indexes,
        }

        return inventory
    finally:
        con.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory DuckDB schema objects (tables, views, columns, indexes).")
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH, help="Path to .duckdb file")
    parser.add_argument("--json-out", type=Path, default=DEFAULT_JSON_OUT, help="Write JSON inventory here")
    parser.add_argument("--md-out", type=Path, default=DEFAULT_MD_OUT, help="Write Markdown inventory here")
    args = parser.parse_args()

    inventory = build_inventory(args.db_path)
    _write_json(args.json_out, inventory)
    _write_md(args.md_out, inventory)

    print(f"Wrote: {args.json_out}")
    print(f"Wrote: {args.md_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


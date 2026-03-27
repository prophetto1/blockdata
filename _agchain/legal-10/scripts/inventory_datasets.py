"""
Inventory all files under legal-10/datasets/ for auditability and pipeline debugging.

Outputs:
  legal-10/datasets/inventory/<timestamp>_datasets_inventory.json
  legal-10/datasets/inventory/<timestamp>_datasets_inventory.md

Includes:
  - file path, size, mtime
  - optional sha256 (for files under a size threshold)
  - row counts for CSV/JSONL (line-count based) and Parquet (DuckDB count)
  - basic schemas for Parquet (DuckDB DESCRIBE), headers for CSV, keys sample for JSONL
  - whether the file is listed in datasets/registry_files_v2.sql
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import duckdb


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATASETS_DIR = PROJECT_ROOT / "datasets"
DEFAULT_OUT_DIR = DEFAULT_DATASETS_DIR / "inventory"


def _utc_now_compact() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")


def _utc_iso_from_mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).replace(microsecond=0).isoformat()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _count_lines_bytes(path: Path) -> int:
    # Counts '\n' occurrences. For CSV, caller can subtract 1 for header if present.
    count = 0
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            count += chunk.count(b"\n")
    return count


def _read_first_text_line(path: Path, max_bytes: int = 256 * 1024) -> str:
    with open(path, "rb") as f:
        raw = f.read(max_bytes)
    # Grab up to first newline
    line = raw.splitlines()[:1]
    if not line:
        return ""
    return line[0].decode("utf-8", errors="replace")


def _file_category(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in {".parquet"}:
        return "parquet"
    if ext in {".csv"}:
        return "csv"
    if ext in {".jsonl"}:
        return "jsonl"
    if ext in {".json"}:
        return "json"
    if ext in {".duckdb"}:
        return "duckdb"
    if ext in {".sql"}:
        return "sql"
    if ext in {".md"}:
        return "md"
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".svg"}:
        return "image"
    if ext in {".ini"}:
        return "ini"
    return "other"


def _load_registry_file_names(datasets_dir: Path) -> set[str]:
    """
    Extracts file_name entries from datasets/registry_files_v2.sql if present.
    Not authoritative; used as a coverage check.
    """
    registry_path = datasets_dir / "registry_files_v2.sql"
    if not registry_path.exists():
        return set()

    text = registry_path.read_text(encoding="utf-8", errors="replace")
    names: set[str] = set()

    # Expected pattern: ('file_name', 'datasets/', ...)
    # Keep it simple: scan for ("('", "', 'datasets/')")
    needle = "', 'datasets/'"
    start = 0
    while True:
        idx = text.find(needle, start)
        if idx == -1:
            break
        # Find preceding "('" and take content between.
        prefix = text.rfind("('", 0, idx)
        if prefix != -1:
            name = text[prefix + 2 : idx]
            if name and "\n" not in name and "\r" not in name:
                names.add(name)
        start = idx + len(needle)

    return names


def _parquet_schema_and_count(con: duckdb.DuckDBPyConnection, path: Path) -> tuple[list[dict[str, Any]], int]:
    p = path.as_posix()
    # Use parameter binding to avoid quoting issues.
    count = int(con.execute("SELECT COUNT(*) FROM read_parquet(?)", [p]).fetchone()[0])
    desc = con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [p]).fetchall()
    schema = [{"name": r[0], "type": r[1]} for r in desc]
    return schema, count


def build_inventory(
    *,
    datasets_dir: Path,
    include_generated: bool,
    hash_max_mb: int,
    parquet_schema: bool,
    parquet_count: bool,
    csv_count: bool,
    jsonl_count: bool,
    sample_jsonl_keys: bool,
) -> dict[str, Any]:
    if not datasets_dir.exists():
        raise FileNotFoundError(str(datasets_dir))

    inventory_dir = datasets_dir / "inventory"
    registry_names = _load_registry_file_names(datasets_dir)

    files: list[Path] = []
    for p in datasets_dir.rglob("*"):
        if not p.is_file():
            continue
        if not include_generated and inventory_dir in p.parents:
            continue
        files.append(p)

    con = duckdb.connect(database=":memory:")
    try:
        items: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []
        for p in sorted(files, key=lambda x: x.as_posix().lower()):
            rel = p.relative_to(datasets_dir).as_posix()
            size = p.stat().st_size
            cat = _file_category(p)

            entry: dict[str, Any] = {
                "path": rel,
                "name": p.name,
                "category": cat,
                "extension": p.suffix.lower(),
                "size_bytes": size,
                "mtime_utc": _utc_iso_from_mtime(p),
                "sha256": None,
                "registered_in_registry_files_v2_sql": p.name in registry_names,
                "row_count": None,
                "schema": None,
                "sample": None,
            }

            try:
                if hash_max_mb >= 0 and size <= hash_max_mb * 1024 * 1024:
                    entry["sha256"] = _sha256_file(p)

                if cat == "parquet":
                    if parquet_schema or parquet_count:
                        schema, count = _parquet_schema_and_count(con, p)
                        if parquet_schema:
                            entry["schema"] = schema
                        if parquet_count:
                            entry["row_count"] = count

                if cat == "csv":
                    header = _read_first_text_line(p)
                    entry["sample"] = {"header": header}
                    if csv_count:
                        # Subtract header if non-empty.
                        lines = _count_lines_bytes(p)
                        entry["row_count"] = max(0, lines - (1 if header else 0))

                if cat == "jsonl":
                    if jsonl_count:
                        entry["row_count"] = _count_lines_bytes(p)
                    if sample_jsonl_keys:
                        first = _read_first_text_line(p)
                        if first:
                            try:
                                obj = json.loads(first)
                                if isinstance(obj, dict):
                                    entry["sample"] = {"keys": sorted(obj.keys())[:200]}
                            except Exception:  # noqa: BLE001
                                entry["sample"] = {"first_line": first[:2000]}

            except Exception as e:  # noqa: BLE001
                errors.append({"path": rel, "error": str(e)})

            items.append(entry)

        by_cat = Counter(i["category"] for i in items)
        total_bytes = sum(i["size_bytes"] for i in items)
        largest = sorted(items, key=lambda i: i["size_bytes"], reverse=True)[:25]
        registry_coverage = {
            "registry_file_count": len(registry_names),
            "present_files_count": len({i["name"] for i in items}),
            "present_files_registered_count": sum(1 for i in items if i["registered_in_registry_files_v2_sql"]),
            "present_files_missing_in_registry_count": sum(1 for i in items if not i["registered_in_registry_files_v2_sql"]),
        }

        return {
            "metadata": {
                "datasets_dir": str(datasets_dir),
                "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                "include_generated": include_generated,
                "hash_max_mb": hash_max_mb,
                "parquet_schema": parquet_schema,
                "parquet_count": parquet_count,
                "csv_count": csv_count,
                "jsonl_count": jsonl_count,
                "sample_jsonl_keys": sample_jsonl_keys,
            },
            "summary": {
                "file_count": len(items),
                "total_bytes": total_bytes,
                "by_category": dict(by_cat),
                "registry_coverage": registry_coverage,
                "largest_files": [{"path": x["path"], "size_bytes": x["size_bytes"], "category": x["category"]} for x in largest],
                "errors_count": len(errors),
            },
            "files": items,
            "errors": errors,
        }
    finally:
        con.close()


def write_markdown(out_path: Path, inv: dict[str, Any]) -> None:
    meta = inv["metadata"]
    summary = inv["summary"]
    by_cat = summary["by_category"]

    lines: list[str] = []
    lines.append("# Datasets inventory")
    lines.append("")
    lines.append(f"- Generated (UTC): `{meta['generated_utc']}`")
    lines.append(f"- Datasets dir: `{meta['datasets_dir']}`")
    lines.append(f"- Files: `{summary['file_count']}`")
    lines.append(f"- Total size (bytes): `{summary['total_bytes']:,}`")
    lines.append("")

    lines.append("## By category")
    for k, v in sorted(by_cat.items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"- `{k}`: {v}")
    lines.append("")

    lines.append("## Registry coverage (datasets/registry_files_v2.sql)")
    rc = summary["registry_coverage"]
    lines.append(f"- Present filenames: `{rc['present_files_count']}`")
    lines.append(f"- Present & registered: `{rc['present_files_registered_count']}`")
    lines.append(f"- Present but missing in registry: `{rc['present_files_missing_in_registry_count']}`")
    lines.append("")

    lines.append("## Largest files")
    for f in summary["largest_files"]:
        lines.append(f"- `{f['path']}` ({f['category']}) — {f['size_bytes']:,} bytes")
    lines.append("")

    if summary["errors_count"]:
        lines.append("## Errors")
        for e in inv["errors"][:50]:
            lines.append(f"- `{e['path']}` — {e['error']}")
        lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory all files under legal-10/datasets/.")
    parser.add_argument("--datasets-dir", type=Path, default=DEFAULT_DATASETS_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--name", type=str, default="", help="Output name prefix (default: timestamp)")

    parser.add_argument("--include-generated", action="store_true", help="Include existing inventory outputs in scan")

    parser.add_argument("--hash-max-mb", type=int, default=50, help="Hash files up to this size (MB). -1 disables hashing.")

    parser.add_argument("--parquet-schema", action="store_true", help="Include Parquet schema via DuckDB DESCRIBE")
    parser.add_argument("--parquet-count", action="store_true", help="Include Parquet row counts via DuckDB COUNT(*)")
    parser.add_argument("--csv-count", action="store_true", help="Include CSV row counts via line counting")
    parser.add_argument("--jsonl-count", action="store_true", help="Include JSONL row counts via line counting")
    parser.add_argument("--sample-jsonl-keys", action="store_true", help="Include sample JSONL keys from first row (best effort)")

    args = parser.parse_args()

    name = args.name.strip() or _utc_now_compact()
    out_json = args.out_dir / f"{name}_datasets_inventory.json"
    out_md = args.out_dir / f"{name}_datasets_inventory.md"

    inv = build_inventory(
        datasets_dir=args.datasets_dir,
        include_generated=args.include_generated,
        hash_max_mb=args.hash_max_mb,
        parquet_schema=args.parquet_schema,
        parquet_count=args.parquet_count,
        csv_count=args.csv_count,
        jsonl_count=args.jsonl_count,
        sample_jsonl_keys=args.sample_jsonl_keys,
    )
    args.out_dir.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(inv, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(out_md, inv)

    print(f"Wrote: {out_json}")
    print(f"Wrote: {out_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


from __future__ import annotations

import argparse
import csv
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class ParquetItem:
    item_kind: str  # duckdb_object | extra_parquet | parquet_untracked
    export_id: str
    export_time_utc: str | None
    source_name: str  # table/view name or extras name
    source_type: str  # table | view | extra
    duckdb_schema: str | None
    duckdb_fqn: str | None
    local_file: Path
    relative_path: str
    row_count: int | None
    file_size_bytes: int | None
    column_count: int | None
    columns_json: str | None
    sha256: str | None


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _as_posix_rel(path: Path, base: Path) -> str:
    try:
        rel = path.resolve().relative_to(base.resolve())
    except Exception:
        rel = path
    return rel.as_posix()


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_manifest(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _iter_parquet_items_from_manifest(
    manifest: dict[str, Any],
    export_dir: Path,
    include_untracked_parquet: bool,
    compute_sha256: bool,
    sha256_max_mb: int,
) -> list[ParquetItem]:
    export_id = (
        manifest.get("database", {}).get("export_id")
        or manifest.get("export_id")
        or export_dir.name
    )
    export_time_utc = manifest.get("database", {}).get("export_time_utc")

    items: list[ParquetItem] = []

    objects = manifest.get("objects") or []
    for obj in objects:
        out_file = obj.get("out_file")
        if not out_file:
            continue
        local_file = Path(out_file)
        if local_file.suffix.lower() != ".parquet":
            continue

        columns = obj.get("columns")
        columns_json = json.dumps(columns, ensure_ascii=False) if columns else None
        file_size_bytes = obj.get("file_size_bytes")

        sha256: str | None = None
        if compute_sha256 and local_file.exists():
            max_bytes = sha256_max_mb * 1024 * 1024
            try:
                size = local_file.stat().st_size
            except OSError:
                size = None
            if size is None or size <= max_bytes:
                sha256 = _sha256_file(local_file)

        items.append(
            ParquetItem(
                item_kind="duckdb_object",
                export_id=export_id,
                export_time_utc=export_time_utc,
                source_name=obj.get("name") or local_file.stem,
                source_type=obj.get("object_type") or "object",
                duckdb_schema=obj.get("schema"),
                duckdb_fqn=obj.get("fqn"),
                local_file=local_file,
                relative_path=_as_posix_rel(local_file, export_dir),
                row_count=obj.get("row_count"),
                file_size_bytes=file_size_bytes,
                column_count=len(columns) if isinstance(columns, list) else None,
                columns_json=columns_json,
                sha256=sha256,
            )
        )

    extras = manifest.get("extras") or []
    for ex in extras:
        as_parquet = ex.get("as_parquet")
        if not as_parquet:
            continue
        local_file = Path(as_parquet)
        if local_file.suffix.lower() != ".parquet":
            continue

        columns = ex.get("columns")
        columns_json = json.dumps(columns, ensure_ascii=False) if columns else None
        file_size_bytes = ex.get("file_size_bytes")

        sha256: str | None = ex.get("sha256")
        if compute_sha256 and sha256 is None and local_file.exists():
            max_bytes = sha256_max_mb * 1024 * 1024
            try:
                size = local_file.stat().st_size
            except OSError:
                size = None
            if size is None or size <= max_bytes:
                sha256 = _sha256_file(local_file)

        items.append(
            ParquetItem(
                item_kind="extra_parquet",
                export_id=export_id,
                export_time_utc=export_time_utc,
                source_name=ex.get("name") or local_file.stem,
                source_type="extra",
                duckdb_schema=None,
                duckdb_fqn=None,
                local_file=local_file,
                relative_path=_as_posix_rel(local_file, export_dir),
                row_count=ex.get("row_count"),
                file_size_bytes=file_size_bytes,
                column_count=len(columns) if isinstance(columns, list) else None,
                columns_json=columns_json,
                sha256=sha256,
            )
        )

    if include_untracked_parquet:
        tracked = {it.local_file.resolve() for it in items if it.local_file.exists()}
        for p in export_dir.rglob("*.parquet"):
            try:
                rp = p.resolve()
            except OSError:
                rp = p
            if rp in tracked:
                continue
            sha256: str | None = None
            if compute_sha256:
                max_bytes = sha256_max_mb * 1024 * 1024
                try:
                    size = p.stat().st_size
                except OSError:
                    size = None
                if size is None or size <= max_bytes:
                    sha256 = _sha256_file(p)
            items.append(
                ParquetItem(
                    item_kind="parquet_untracked",
                    export_id=export_id,
                    export_time_utc=export_time_utc,
                    source_name=p.stem,
                    source_type="unknown",
                    duckdb_schema=None,
                    duckdb_fqn=None,
                    local_file=p,
                    relative_path=_as_posix_rel(p, export_dir),
                    row_count=None,
                    file_size_bytes=None,
                    column_count=None,
                    columns_json=None,
                    sha256=sha256,
                )
            )

    return sorted(items, key=lambda it: (it.item_kind, it.source_type, it.source_name))


def _rows_for_csv(
    items: Iterable[ParquetItem],
    export_dir: Path,
    dbfs_prefix: str,
) -> Iterable[dict[str, Any]]:
    for it in items:
        suggested_dbfs_path = (
            f"{dbfs_prefix.rstrip('/')}/{it.export_id}/{it.relative_path}"
        )
        yield {
            # Recommended: drag these columns into Langfuse “input”
            "item_kind": it.item_kind,
            "source_type": it.source_type,
            "source_name": it.source_name,
            "duckdb_schema": it.duckdb_schema or "",
            "duckdb_fqn": it.duckdb_fqn or "",
            "export_id": it.export_id,
            "export_time_utc": it.export_time_utc or "",
            "relative_path": it.relative_path,
            "local_file": str(it.local_file),
            "row_count": it.row_count if it.row_count is not None else "",
            "file_size_bytes": it.file_size_bytes if it.file_size_bytes is not None else "",
            "column_count": it.column_count if it.column_count is not None else "",
            "columns_json": it.columns_json or "",
            "sha256": it.sha256 or "",
            # Recommended: put this in “metadata” (or keep in input)
            "suggested_dbfs_path": suggested_dbfs_path,
            "generated_at_utc": _now_utc_iso(),
            "export_dir": str(export_dir),
        }


def main() -> int:
    p = argparse.ArgumentParser(
        description=(
            "Generate a Langfuse Dataset CSV from a DuckDB→Parquet export manifest.json.\n\n"
            "Langfuse datasets store dataset *items* (JSON-ish input/expectedOutput/metadata), not Parquet bytes.\n"
            "This script produces a CSV where each row is one Parquet file, with integrity metadata (sha256) and"
            " suggested DBFS paths, so you can map columns in the Langfuse UI."
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    p.add_argument(
        "--manifest",
        type=Path,
        required=True,
        help="Path to export manifest.json (from export_duckdb_to_parquet.py).",
    )
    p.add_argument(
        "--out-csv",
        type=Path,
        default=None,
        help="Output CSV path. Default: <export_dir>/langfuse_dataset_items.csv",
    )
    p.add_argument(
        "--dbfs-prefix",
        type=str,
        default="dbfs:/FileStore/legal10_exports",
        help="DBFS prefix used to build suggested_dbfs_path values.",
    )
    p.add_argument(
        "--include-untracked-parquet",
        action="store_true",
        help="Also include any *.parquet under export_dir not present in the manifest.",
    )
    p.add_argument(
        "--no-sha256",
        action="store_true",
        help="Skip sha256 computation for Parquet files (extras may still include sha256 from the manifest).",
    )
    p.add_argument(
        "--sha256-max-mb",
        type=int,
        default=512,
        help="Only compute sha256 for files up to this size (MB).",
    )
    args = p.parse_args()

    manifest_path: Path = args.manifest
    if not manifest_path.exists():
        raise SystemExit(f"manifest not found: {manifest_path}")
    if manifest_path.name.lower() != "manifest.json":
        raise SystemExit(f"expected a manifest.json path, got: {manifest_path}")

    export_dir = manifest_path.parent
    out_csv: Path = args.out_csv or (export_dir / "langfuse_dataset_items.csv")
    compute_sha256 = not args.no_sha256

    manifest = _load_manifest(manifest_path)
    items = _iter_parquet_items_from_manifest(
        manifest=manifest,
        export_dir=export_dir,
        include_untracked_parquet=bool(args.include_untracked_parquet),
        compute_sha256=compute_sha256,
        sha256_max_mb=int(args.sha256_max_mb),
    )

    rows = list(_rows_for_csv(items=items, export_dir=export_dir, dbfs_prefix=args.dbfs_prefix))
    if not rows:
        print("No Parquet items found in manifest (objects/extras).")
        return 2

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    print(f"Wrote {len(rows)} rows -> {out_csv}")
    print("Langfuse UI: Datasets -> New Dataset -> Upload CSV -> drag columns into input/metadata as desired.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


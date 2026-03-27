from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil


def iter_sql_files(legal10_root: Path, export_dir: Path) -> list[Path]:
    sql_files: list[Path] = []
    for path in legal10_root.rglob("*.sql"):
        if not path.is_file():
            continue
        # Don't re-stage anything already inside the export folder.
        try:
            path.relative_to(export_dir)
            continue
        except ValueError:
            pass
        sql_files.append(path)
    return sorted(sql_files)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Copy all .sql files from legal-10 into an export folder under sql/, preserving relative paths."
    )
    parser.add_argument(
        "--legal10-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to the legal-10 directory (default: repo/legal-10).",
    )
    parser.add_argument(
        "--export-dir",
        default=r"E:\agchain\legal-10\datasets\parquet\2026-02-05_095022_duckdb_export",
        help="Target export directory to augment with sql/ (default: Feb 5 2026 export).",
    )
    args = parser.parse_args()

    legal10_root = Path(args.legal10_root).resolve()
    export_dir = Path(args.export_dir).resolve()
    if not export_dir.exists():
        raise SystemExit(f"Export dir not found: {export_dir}")

    sql_files = iter_sql_files(legal10_root, export_dir)
    sql_root = export_dir / "sql"
    sql_root.mkdir(parents=True, exist_ok=True)

    staged: list[tuple[Path, Path]] = []
    for src in sql_files:
        rel = src.relative_to(legal10_root)
        dst = sql_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        staged.append((src, dst))

    index_path = sql_root / "SQL_FILES.txt"
    with index_path.open("w", encoding="utf-8") as f:
        f.write(f"Staged {len(staged)} SQL files into: {sql_root}\n")
        f.write("Source -> Destination\n")
        for src, dst in staged:
            f.write(f"{src} -> {dst}\n")

    print(f"Staged {len(staged)} SQL files into {sql_root}")
    print(f"Wrote index: {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


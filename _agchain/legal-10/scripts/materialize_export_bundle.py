"""
materialize_export_bundle.py

Materialize a DuckDB→Parquet export bundle into an expected `datasets/parquet/<export_id>/` folder.

Why:
- Some tooling expects `manifest.json`'s `out_file` paths (typically under `datasets/parquet/<export_id>/...`)
  to exist on disk.
- Bundles under `datasets/bundles/<export_id>/...` may contain the payload, while the expected `datasets/parquet/...`
  directory is missing.

This script can hardlink (default) to avoid duplicating large Parquet files.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any


def _safe_mkdir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _hardlink_or_copy(*, src: Path, dst: Path, mode: str) -> str:
    if dst.exists():
        raise FileExistsError(str(dst))
    _safe_mkdir(dst.parent)
    if mode == "hardlink":
        os.link(src, dst)
        return "hardlink"
    if mode == "copy":
        shutil.copy2(src, dst)
        return "copy"
    raise ValueError(f"Unknown mode: {mode}")


def _load_manifest(manifest_path: Path) -> dict[str, Any]:
    return json.loads(manifest_path.read_text(encoding="utf-8", errors="replace"))


def materialize_bundle(*, bundle_dir: Path, out_dir: Path, mode: str) -> dict[str, Any]:
    manifest_path = bundle_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest.json not found under bundle: {manifest_path}")

    manifest = _load_manifest(manifest_path)
    export_id = (manifest.get("database") or {}).get("export_id") or bundle_dir.name

    # Copy/link a curated set of paths; keep this tight to avoid unexpected bloat.
    candidates: list[Path] = []
    for rel in ("manifest.json", "README.md"):
        p = bundle_dir / rel
        if p.exists() and p.is_file():
            candidates.append(p)

    for rel_dir in ("tables", "views", "sql"):
        base = bundle_dir / rel_dir
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if p.is_file():
                candidates.append(p)

    linked: list[dict[str, Any]] = []
    for src in sorted(candidates, key=lambda p: p.as_posix().lower()):
        rel = src.relative_to(bundle_dir)
        dst = out_dir / rel
        op = _hardlink_or_copy(src=src, dst=dst, mode=mode)
        linked.append({"src": str(src), "dst": str(dst), "op": op})

    # Verify manifest out_files exist now (best-effort; does not rewrite manifest)
    missing_out_files: list[str] = []
    objects = manifest.get("objects") or []
    for obj in objects:
        out_file = (obj or {}).get("out_file")
        if not out_file:
            continue
        if not Path(out_file).exists():
            missing_out_files.append(str(out_file))

    return {
        "bundle_dir": str(bundle_dir),
        "out_dir": str(out_dir),
        "export_id": export_id,
        "mode": mode,
        "files_materialized": len(linked),
        "missing_manifest_out_files": missing_out_files,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize an export bundle into datasets/parquet/<export_id>/ via hardlinks or copies.")
    parser.add_argument("--bundle-dir", type=Path, required=True, help="Path to a bundle directory containing manifest.json + tables/views.")
    parser.add_argument("--out-dir", type=Path, required=True, help="Target export directory (typically datasets/parquet/<export_id>/).")
    parser.add_argument("--mode", choices=["hardlink", "copy"], default="hardlink")
    args = parser.parse_args()

    bundle_dir = args.bundle_dir.resolve()
    out_dir = args.out_dir.resolve()
    _safe_mkdir(out_dir)

    result = materialize_bundle(bundle_dir=bundle_dir, out_dir=out_dir, mode=args.mode)
    print(json.dumps(result, indent=2))

    if result["missing_manifest_out_files"]:
        raise SystemExit(f"Missing {len(result['missing_manifest_out_files'])} manifest out_files after materialization.")


if __name__ == "__main__":
    main()


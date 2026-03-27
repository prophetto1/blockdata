"""
bundle_categorize_and_dedupe.py

Goal:
1) Build a *categorized* bundle view of `legal-10/datasets` under `legal-10/datasets/bundles/<bundle_id>/categorized/`.
   - Default strategy uses NTFS hardlinks to avoid duplicating large dataset files.
2) Compare `legal-10/datasets/*` (excluding generated folders) against existing bundles by *file content*
   (SHA-256 + size), and optionally move/delete verified duplicates from the old location.

This script is intentionally conservative:
- It never deletes by default; it moves verified duplicates into `legal-10/datasets/_deduped/<run_id>/...`.
- It only considers a dataset file "matched" if BOTH SHA-256 and size match.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATASETS_DIR = PROJECT_ROOT / "datasets"
DEFAULT_BUNDLES_DIR = DEFAULT_DATASETS_DIR / "bundles"
DEFAULT_OUT_DIR = DEFAULT_DATASETS_DIR / "inventory"

DEFAULT_EXCLUDE_DIRS = {"bundles", "inventory", "parquet", "_deduped"}


def _utc_now_compact() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _file_category(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".parquet":
        return "parquet"
    if ext == ".csv":
        return "csv"
    if ext == ".jsonl":
        return "jsonl"
    if ext == ".json":
        return "json"
    if ext == ".duckdb":
        return "duckdb"
    if ext == ".sql":
        return "sql"
    if ext == ".md":
        return "md"
    if ext == ".ini":
        return "ini"
    if ext == ".txt":
        return "txt"
    return "other"


def _iter_dataset_files(datasets_dir: Path, *, exclude_dirs: set[str]) -> Iterable[Path]:
    for p in datasets_dir.rglob("*"):
        if not p.is_file():
            continue
        # Exclude by first path segment relative to datasets_dir
        try:
            rel = p.relative_to(datasets_dir)
        except ValueError:
            continue
        if rel.parts and rel.parts[0] in exclude_dirs:
            continue
        yield p


def _iter_bundle_files(bundles_dir: Path, *, exclude_bundle_ids: set[str]) -> Iterable[Path]:
    if not bundles_dir.exists():
        return
    for p in bundles_dir.rglob("*"):
        if not p.is_file():
            continue
        try:
            rel = p.relative_to(bundles_dir)
        except ValueError:
            continue
        if rel.parts and rel.parts[0] in exclude_bundle_ids:
            continue
        yield p


@dataclass(frozen=True)
class FileSig:
    sha256: str
    size_bytes: int


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


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    _safe_mkdir(path.parent)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _write_md(path: Path, payload: dict[str, Any]) -> None:
    _safe_mkdir(path.parent)

    lines: list[str] = []
    lines.append("# Bundle categorize + dedupe report")
    lines.append("")
    lines.append(f"- Generated UTC: `{payload['generated_utc']}`")
    lines.append(f"- Datasets dir: `{payload['datasets_dir']}`")
    lines.append(f"- Bundles dir: `{payload['bundles_dir']}`")
    lines.append(f"- Link mode: `{payload['categorized_bundle'].get('link_mode')}`")
    lines.append("")

    cat = payload.get("categorized_bundle") or {}
    if cat.get("bundle_id"):
        lines.append("## Categorized bundle")
        lines.append(f"- Bundle ID: `{cat['bundle_id']}`")
        lines.append(f"- Bundle root: `{cat['bundle_root']}`")
        lines.append(f"- Files included: `{cat['files_included']}`")
        lines.append("")

    dup = payload.get("verified_duplicates") or {}
    lines.append("## Verified duplicates (datasets/ vs bundles/)")
    lines.append(f"- Dataset files scanned: `{dup.get('datasets_files_scanned', 0)}`")
    lines.append(f"- Bundle files scanned: `{dup.get('bundle_files_scanned', 0)}`")
    lines.append(f"- Verified duplicate dataset files: `{dup.get('verified_duplicate_datasets_files', 0)}`")
    lines.append(f"- Action: `{dup.get('action', 'none')}`")
    if dup.get("action") in {"move", "delete"}:
        lines.append(f"- Destination: `{dup.get('destination', '')}`")
    lines.append("")

    rows = dup.get("rows") or []
    if not rows:
        lines.append("- (none)")
    else:
        for r in rows:
            lines.append(f"- `{r['dataset_path']}` == `{r['bundle_path']}` (sha256={r['sha256']}, size={r['size_bytes']})")
    lines.append("")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def run(
    *,
    datasets_dir: Path,
    bundles_dir: Path,
    out_dir: Path,
    exclude_dirs: set[str],
    exclude_bundle_ids: set[str],
    create_categorized_bundle: bool,
    categorized_bundle_id: str | None,
    link_mode: str,
    dedupe_action: str,
) -> tuple[Path, Path]:
    run_id = _utc_now_compact()
    generated_utc = _utc_now_iso()

    if not datasets_dir.exists():
        raise FileNotFoundError(str(datasets_dir))

    # ------------------------------------------------------------------
    # Scan datasets (excluding generated dirs)
    # ------------------------------------------------------------------
    dataset_files = list(_iter_dataset_files(datasets_dir, exclude_dirs=exclude_dirs))
    dataset_sigs: dict[str, FileSig] = {}
    sig_to_dataset_paths: dict[tuple[str, int], list[str]] = {}
    for p in sorted(dataset_files, key=lambda x: x.as_posix().lower()):
        rel = p.relative_to(datasets_dir).as_posix()
        size = p.stat().st_size
        sha = _sha256_file(p)
        dataset_sigs[rel] = FileSig(sha256=sha, size_bytes=size)
        sig_to_dataset_paths.setdefault((sha, size), []).append(rel)

    # ------------------------------------------------------------------
    # Scan bundles (all existing bundle files) and build sig index
    # ------------------------------------------------------------------
    effective_exclude_bundle_ids = set(exclude_bundle_ids)
    if create_categorized_bundle and categorized_bundle_id:
        effective_exclude_bundle_ids.add(categorized_bundle_id)

    bundle_files = list(_iter_bundle_files(bundles_dir, exclude_bundle_ids=effective_exclude_bundle_ids))
    sig_to_bundle_paths: dict[tuple[str, int], list[str]] = {}
    for p in sorted(bundle_files, key=lambda x: x.as_posix().lower()):
        rel = p.relative_to(datasets_dir).as_posix() if datasets_dir in p.parents else p.as_posix()
        size = p.stat().st_size
        sha = _sha256_file(p)
        sig_to_bundle_paths.setdefault((sha, size), []).append(rel)

    # ------------------------------------------------------------------
    # Identify verified duplicates: a datasets file with any bundle file having same sig
    # ------------------------------------------------------------------
    verified_rows: list[dict[str, Any]] = []
    for dataset_rel, sig in sorted(dataset_sigs.items(), key=lambda kv: kv[0].lower()):
        bundle_matches = sig_to_bundle_paths.get((sig.sha256, sig.size_bytes))
        if not bundle_matches:
            continue
        # Pick one canonical bundle match for reporting (stable)
        bundle_path = sorted(bundle_matches, key=lambda s: s.lower())[0]
        verified_rows.append(
            {
                "dataset_path": dataset_rel,
                "bundle_path": bundle_path,
                "sha256": sig.sha256,
                "size_bytes": sig.size_bytes,
            }
        )

    # ------------------------------------------------------------------
    # Optional: create categorized bundle view (hardlinks by default)
    # ------------------------------------------------------------------
    categorized_info: dict[str, Any] = {}
    if create_categorized_bundle:
        bundle_id = categorized_bundle_id or f"{run_id}_datasets_categorized"
        bundle_root = bundles_dir / bundle_id
        categorized_root = bundle_root / "categorized"
        effective_exclude_bundle_ids.add(bundle_id)

        files_included = 0
        mapping: list[dict[str, Any]] = []
        for p in sorted(dataset_files, key=lambda x: x.as_posix().lower()):
            rel = p.relative_to(datasets_dir).as_posix()
            cat = _file_category(p)
            dst_rel = Path("categorized") / cat / Path(rel)
            dst = bundle_root / dst_rel
            op = _hardlink_or_copy(src=p, dst=dst, mode=link_mode)
            sig = dataset_sigs[rel]
            mapping.append(
                {
                    "src_rel": rel,
                    "dst_rel": dst_rel.as_posix(),
                    "category": cat,
                    "op": op,
                    "sha256": sig.sha256,
                    "size_bytes": sig.size_bytes,
                }
            )
            files_included += 1

        categorized_manifest = {
            "bundle_id": bundle_id,
            "generated_utc": generated_utc,
            "datasets_dir": str(datasets_dir),
            "link_mode": link_mode,
            "files_included": files_included,
            "mapping": mapping,
        }
        _write_json(bundle_root / "manifest.categorized.json", categorized_manifest)
        (bundle_root / "README.md").write_text(
            "\n".join(
                [
                    "# Categorized datasets bundle",
                    "",
                    f"Bundle ID: `{bundle_id}`",
                    f"Generated (UTC): `{generated_utc}`",
                    f"Link mode: `{link_mode}`",
                    "",
                    "## Layout",
                    "- `categorized/<category>/<original-relative-path>`",
                    "",
                    "## Notes",
                    "- `hardlink` avoids duplicating large files; deleting the original keeps the bundle copy.",
                    "- The authoritative content identity in this bundle is `sha256` recorded in `manifest.categorized.json`.",
                    "",
                ]
            ).rstrip()
            + "\n",
            encoding="utf-8",
        )

        categorized_info = {
            "bundle_id": bundle_id,
            "bundle_root": str(bundle_root),
            "categorized_root": str(categorized_root),
            "link_mode": link_mode,
            "files_included": files_included,
        }

    # ------------------------------------------------------------------
    # Optional: move/delete verified-duplicate dataset files
    # ------------------------------------------------------------------
    action = dedupe_action
    dest_base: Path | None = None
    if action not in {"none", "move", "delete"}:
        raise ValueError("--dedupe-action must be one of: none, move, delete")

    if action in {"move", "delete"} and verified_rows:
        if action == "move":
            dest_base = datasets_dir / "_deduped" / run_id
            for r in verified_rows:
                src = datasets_dir / Path(r["dataset_path"])
                dst = dest_base / Path(r["dataset_path"])
                _safe_mkdir(dst.parent)
                if not src.exists():
                    continue
                shutil.move(str(src), str(dst))
                r["dedupe_action_applied"] = "move"
                r["dedupe_destination"] = dst.as_posix()
        else:
            for r in verified_rows:
                src = datasets_dir / Path(r["dataset_path"])
                if not src.exists():
                    continue
                src.unlink()
                r["dedupe_action_applied"] = "delete"

    report = {
        "generated_utc": generated_utc,
        "run_id": run_id,
        "datasets_dir": str(datasets_dir),
        "bundles_dir": str(bundles_dir),
        "exclude_dirs": sorted(exclude_dirs),
        "exclude_bundle_ids": sorted(effective_exclude_bundle_ids),
        "categorized_bundle": categorized_info,
        "verified_duplicates": {
            "datasets_files_scanned": len(dataset_files),
            "bundle_files_scanned": len(bundle_files),
            "verified_duplicate_datasets_files": len(verified_rows),
            "action": action,
            "destination": str(dest_base) if dest_base is not None else None,
            "rows": verified_rows,
        },
    }

    json_out = out_dir / f"{run_id}_bundle_categorize_and_dedupe.json"
    md_out = out_dir / f"{run_id}_bundle_categorize_and_dedupe.md"
    _write_json(json_out, report)
    _write_md(md_out, report)
    return json_out, md_out


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a categorized datasets bundle and content-verify duplicates vs bundles.")
    parser.add_argument("--datasets-dir", type=Path, default=DEFAULT_DATASETS_DIR)
    parser.add_argument("--bundles-dir", type=Path, default=DEFAULT_BUNDLES_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--exclude-dir", action="append", default=[], help="Exclude first-segment directories (repeatable).")
    parser.add_argument("--exclude-bundle-id", action="append", default=[], help="Exclude specific bundle IDs under datasets/bundles/ (repeatable).")

    parser.add_argument("--create-categorized-bundle", action="store_true", help="Create bundles/<bundle_id>/categorized/ view.")
    parser.add_argument("--bundle-id", type=str, default=None, help="Bundle ID folder name under datasets/bundles/.")
    parser.add_argument("--link-mode", choices=["hardlink", "copy"], default="hardlink")

    parser.add_argument("--dedupe-action", choices=["none", "move", "delete"], default="move")

    args = parser.parse_args()

    exclude_dirs = set(DEFAULT_EXCLUDE_DIRS)
    exclude_dirs.update({s.strip() for s in args.exclude_dir if (s or "").strip()})

    json_out, md_out = run(
        datasets_dir=args.datasets_dir,
        bundles_dir=args.bundles_dir,
        out_dir=args.out_dir,
        exclude_dirs=exclude_dirs,
        exclude_bundle_ids={s.strip() for s in args.exclude_bundle_id if (s or "").strip()},
        create_categorized_bundle=bool(args.create_categorized_bundle),
        categorized_bundle_id=args.bundle_id,
        link_mode=args.link_mode,
        dedupe_action=args.dedupe_action,
    )

    print(str(json_out))
    print(str(md_out))


if __name__ == "__main__":
    main()

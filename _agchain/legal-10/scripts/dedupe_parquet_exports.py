"""
Find (and optionally delete) duplicate DuckDB→Parquet export folders under:
  legal-10/datasets/parquet/

Notes
-----
- Export folders are created by `legal-10/scripts/export_duckdb_to_parquet.py`.
- Each run produces a unique folder when timestamped export ids are used.
- Folder payloads can be identical while `manifest.json` and `README.md` differ
  (timestamps / invocation metadata). This tool compares *payload* by default.

Default behavior is safe: it only reports duplicates (dry-run).
Deletion requires `--delete --yes`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXPORT_ROOT = PROJECT_ROOT / "datasets" / "parquet"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256_path(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _iter_files(base_dir: Path) -> Iterable[Path]:
    # Deterministic order for reproducible fingerprints.
    yield from sorted((p for p in base_dir.rglob("*") if p.is_file()), key=lambda p: p.as_posix().lower())


DEFAULT_EXCLUDE_FILES = {
    "manifest.json",
    "readme.md",
    "desktop.ini",
}


def _is_excluded(path: Path, *, exclude_names: set[str]) -> bool:
    return path.name.lower() in exclude_names


@dataclass(frozen=True)
class ExportRun:
    path: Path
    manifest_path: Path
    export_time_utc: str | None


def _discover_export_runs(root: Path) -> list[ExportRun]:
    runs: list[ExportRun] = []
    if not root.exists():
        return runs

    for d in sorted((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.name.lower()):
        manifest_path = d / "manifest.json"
        if not manifest_path.exists():
            continue

        export_time_utc: str | None = None
        try:
            obj = _load_json(manifest_path)
            export_time_utc = obj.get("database", {}).get("export_time_utc")
        except Exception:  # noqa: BLE001
            export_time_utc = None

        runs.append(ExportRun(path=d, manifest_path=manifest_path, export_time_utc=export_time_utc))
    return runs


def _parse_iso_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        # Handles offsets like +00:00.
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _keep_choice(runs: list[ExportRun], keep: str) -> ExportRun:
    if keep == "newest":
        best = max(runs, key=lambda r: _parse_iso_dt(r.export_time_utc) or datetime.min.replace(tzinfo=timezone.utc))
        return best
    if keep == "oldest":
        best = min(runs, key=lambda r: _parse_iso_dt(r.export_time_utc) or datetime.max.replace(tzinfo=timezone.utc))
        return best
    # Explicit directory name.
    for r in runs:
        if r.path.name == keep:
            return r
    raise ValueError(f"--keep '{keep}' not found among: {[r.path.name for r in runs]}")


def _fingerprint_manifest_payload(manifest: dict[str, Any]) -> str:
    """
    Fast-ish fingerprint based on manifest payload only.

    Ignores invocation and timestamps; uses object identity + row_count + file_size,
    and extras identity + sha256 + file_size (+ parquet conversion path if any).
    """
    objs = manifest.get("objects") or []
    extras = manifest.get("extras") or []

    obj_rows: list[str] = []
    for o in objs:
        if not isinstance(o, dict):
            continue
        # Stable identity key for tables/views.
        fqn = str(o.get("fqn") or "")
        obj_type = str(o.get("object_type") or "")
        size = o.get("file_size_bytes")
        rows = o.get("row_count")
        status = str(o.get("status") or "")
        obj_rows.append(f"{obj_type}|{fqn}|{status}|{size}|{rows}")

    extra_rows: list[str] = []
    for e in extras:
        if not isinstance(e, dict):
            continue
        name = str(e.get("name") or "")
        sha = str(e.get("sha256") or "")
        size = e.get("file_size_bytes")
        status = str(e.get("status") or "")
        as_parquet = str(e.get("as_parquet") or "")
        extra_rows.append(f"{name}|{status}|{size}|{sha}|{as_parquet}")

    payload = {
        "objects": sorted(obj_rows),
        "extras": sorted(extra_rows),
        "summary": {
            "tables_discovered": (manifest.get("summary") or {}).get("tables_discovered"),
            "views_discovered": (manifest.get("summary") or {}).get("views_discovered"),
            "objects_exported": (manifest.get("summary") or {}).get("objects_exported"),
            "objects_failed": (manifest.get("summary") or {}).get("objects_failed"),
        },
        "export": {
            "compression": (manifest.get("export") or {}).get("compression"),
            "include_views": (manifest.get("export") or {}).get("include_views"),
            "extras_profile": (manifest.get("export") or {}).get("extras_profile"),
            "extras_convert_max_mb": (manifest.get("export") or {}).get("extras_convert_max_mb"),
            "with_row_counts": (manifest.get("export") or {}).get("with_row_counts"),
            "only_filters": (manifest.get("export") or {}).get("only_filters"),
        },
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def _load_manifest_extras_sha_by_relpath(run_dir: Path, manifest: dict[str, Any]) -> dict[str, str]:
    """
    Map relative file paths within the run dir to SHA256 from manifest extras entries,
    so we can avoid re-hashing large `extras/raw/*` files.
    """
    out: dict[str, str] = {}
    for e in manifest.get("extras") or []:
        if not isinstance(e, dict):
            continue
        copied = e.get("copied_file")
        sha = e.get("sha256")
        if not copied or not sha:
            continue
        try:
            p = Path(str(copied))
            rel = p.resolve().relative_to(run_dir.resolve()).as_posix().lower()
        except Exception:  # noqa: BLE001
            continue
        out[rel] = str(sha)
    return out


def _fingerprint_files(
    run: ExportRun,
    *,
    exclude_names: set[str],
) -> str:
    """
    Strict fingerprint: hashes all payload files under the run dir, excluding
    manifest/readme/desktop.ini by default.

    Optimization: if a file matches an `extras` entry in manifest, use its recorded sha256.
    """
    manifest = {}
    try:
        manifest = _load_json(run.manifest_path)
    except Exception:  # noqa: BLE001
        manifest = {}

    extras_sha = _load_manifest_extras_sha_by_relpath(run.path, manifest)

    h = hashlib.sha256()
    for p in _iter_files(run.path):
        if _is_excluded(p, exclude_names=exclude_names):
            continue
        rel = p.resolve().relative_to(run.path.resolve()).as_posix().lower()
        size = p.stat().st_size
        sha = extras_sha.get(rel) or _sha256_path(p)
        line = f"{rel}\0{size}\0{sha}\n".encode("utf-8")
        h.update(line)
    return h.hexdigest()


def _payload_file_sha_map(
    run: ExportRun,
    *,
    exclude_names: set[str],
) -> dict[str, str]:
    """
    Map payload relative path -> sha256. Used for subset/superset redundancy detection.
    Excludes manifest/readme/desktop.ini by default.

    Optimization: uses sha256 values already recorded in manifest extras entries.
    """
    try:
        manifest = _load_json(run.manifest_path)
    except Exception:  # noqa: BLE001
        manifest = {}

    extras_sha = _load_manifest_extras_sha_by_relpath(run.path, manifest)
    out: dict[str, str] = {}
    for p in _iter_files(run.path):
        if _is_excluded(p, exclude_names=exclude_names):
            continue
        rel = p.resolve().relative_to(run.path.resolve()).as_posix().lower()
        out[rel] = extras_sha.get(rel) or _sha256_path(p)
    return out


def _is_subset_payload(a: dict[str, str], b: dict[str, str]) -> bool:
    if len(a) > len(b):
        return False
    for rel, sha in a.items():
        if b.get(rel) != sha:
            return False
    return True


def _redundant_by_superset(
    runs: list[ExportRun],
    *,
    keep: str,
    exclude_names: set[str],
) -> dict[ExportRun, list[ExportRun]]:
    """
    Group runs by a chosen keeper, where other runs are strict subsets (by payload files)
    of the keeper and all overlapping file hashes match.
    """
    file_maps: dict[Path, dict[str, str]] = {}
    for r in runs:
        file_maps[r.path] = _payload_file_sha_map(r, exclude_names=exclude_names)

    keep_map: dict[Path, ExportRun] = {}
    for r in runs:
        a = file_maps[r.path]
        supersets: list[ExportRun] = [s for s in runs if _is_subset_payload(a, file_maps[s.path])]

        # Decide keeper among supersets.
        if keep not in ("newest", "oldest"):
            chosen = next((s for s in supersets if s.path.name == keep), None)
            if chosen is None:
                # If keep name isn't a superset, fall back to newest (safe) but keep behavior explicit.
                chosen = _keep_choice(supersets, "newest")
        else:
            chosen = _keep_choice(supersets, keep)

        keep_map[r.path] = chosen

    grouped: dict[ExportRun, list[ExportRun]] = {}
    for r in runs:
        k = keep_map[r.path]
        grouped.setdefault(k, []).append(r)

    # Filter to only groups with >1 run (i.e. something redundant).
    out: dict[ExportRun, list[ExportRun]] = {}
    for k, members in grouped.items():
        uniq = {m.path.resolve(): m for m in members}.values()
        members_sorted = sorted(list(uniq), key=lambda rr: rr.path.name.lower())
        if len(members_sorted) > 1:
            out[k] = members_sorted
    return out


def _group_duplicates(runs: list[ExportRun], *, mode: str, exclude_names: set[str]) -> dict[str, list[ExportRun]]:
    groups: dict[str, list[ExportRun]] = {}
    for r in runs:
        if mode == "manifest":
            try:
                fp = _fingerprint_manifest_payload(_load_json(r.manifest_path))
            except Exception:  # noqa: BLE001
                fp = f"error:{r.path.name}"
        elif mode == "strict":
            fp = _fingerprint_files(r, exclude_names=exclude_names)
        else:
            raise ValueError(f"Unknown mode: {mode}")
        groups.setdefault(fp, []).append(r)
    return {k: v for k, v in groups.items() if len(v) > 1}


def main() -> int:
    parser = argparse.ArgumentParser(description="Report (and optionally delete) duplicate parquet export folders.")
    parser.add_argument("--root", type=Path, default=DEFAULT_EXPORT_ROOT, help="Root export directory to scan")
    parser.add_argument(
        "--mode",
        choices=("manifest", "strict", "superset", "purge"),
        default="manifest",
        help=(
            "How to detect duplicates/redundancy: "
            "manifest (fast), strict (hash payload files), superset (find redundant subsets), "
            "purge (delete ALL export runs found)"
        ),
    )
    parser.add_argument(
        "--keep",
        type=str,
        default="newest",
        help="Which folder to keep per duplicate group: newest, oldest, or an explicit directory name",
    )
    parser.add_argument("--delete", action="store_true", help="Delete duplicates (requires --yes)")
    parser.add_argument("--yes", action="store_true", help="Confirm deletion (required with --delete)")
    parser.add_argument(
        "--include-manifest-and-readme",
        action="store_true",
        help="Include manifest.json/README.md in strict payload hashing (default: excluded)",
    )
    args = parser.parse_args()

    runs = _discover_export_runs(args.root)
    if not runs:
        print(f"[{_utc_now_iso()}] No export runs found under: {args.root}")
        return 0

    exclude_names = set(DEFAULT_EXCLUDE_FILES)
    if args.include_manifest_and_readme:
        exclude_names.discard("manifest.json")
        exclude_names.discard("readme.md")

    delete_plan: list[Path] = []
    if args.mode == "purge":
        print(f"[{_utc_now_iso()}] Export runs found: {len(runs)} (mode=purge)")
        for r in sorted(runs, key=lambda rr: rr.path.name.lower()):
            print(f"  delete: {r.path.name} (export_time_utc={r.export_time_utc})")
            delete_plan.append(r.path)
    elif args.mode == "superset":
        redundant = _redundant_by_superset(runs, keep=args.keep, exclude_names=exclude_names)
        if not redundant:
            print(f"[{_utc_now_iso()}] No redundant subsets found (mode=superset).")
            return 0

        print(f"[{_utc_now_iso()}] Redundant subset groups found: {len(redundant)} (mode=superset)")
        for keeper, group in sorted(redundant.items(), key=lambda kv: kv[0].path.name.lower()):
            print(f"\n- keep: {keeper.path.name} (export_time_utc={keeper.export_time_utc})")
            for r in group:
                if r.path == keeper.path:
                    continue
                print(f"  delete: {r.path.name} (export_time_utc={r.export_time_utc})")
                delete_plan.append(r.path)
    else:
        dups = _group_duplicates(runs, mode=args.mode, exclude_names=exclude_names)
        if not dups:
            print(f"[{_utc_now_iso()}] No duplicates found (mode={args.mode}).")
            return 0

        print(f"[{_utc_now_iso()}] Duplicate groups found: {len(dups)} (mode={args.mode})")
        for fp, group in sorted(dups.items(), key=lambda kv: kv[0]):
            print(f"\n- fingerprint: {fp}")
            for r in sorted(group, key=lambda rr: rr.path.name.lower()):
                print(f"  - {r.path.name} (export_time_utc={r.export_time_utc})")

            keep_run = _keep_choice(group, args.keep)
            to_delete = [r for r in group if r.path != keep_run.path]
            if to_delete:
                print(f"  keep: {keep_run.path.name}")
                for r in to_delete:
                    print(f"  delete: {r.path.name}")
                    delete_plan.append(r.path)

    if not args.delete:
        print("\nDry-run only. To delete: re-run with `--delete --yes`.")
        return 0

    if not args.yes:
        print("ERROR: `--delete` requires `--yes`.", file=sys.stderr)
        return 2

    # Safety: never delete outside the root.
    root_resolved = args.root.resolve()
    for p in delete_plan:
        if root_resolved not in p.resolve().parents:
            print(f"ERROR: Refusing to delete outside root: {p}", file=sys.stderr)
            return 2

    def _on_rmtree_error(func, path, exc_info):  # type: ignore[no-untyped-def]
        # Windows exports often inherit read-only attributes; make writable and retry.
        try:
            os.chmod(path, stat.S_IWRITE)
        except Exception:  # noqa: BLE001
            pass
        func(path)

    for p in delete_plan:
        print(f"Deleting: {p}")
        shutil.rmtree(p, onerror=_on_rmtree_error)

    print(f"Deleted {len(delete_plan)} folders.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

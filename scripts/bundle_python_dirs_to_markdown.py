from __future__ import annotations

import argparse
import re
import tokenize
from pathlib import Path


IGNORED_DIR_NAMES = {
    "__pycache__",
    ".git",
    ".hg",
    ".svn",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "build",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Bundle Python source trees into Markdown documents. "
            "Each immediate child directory of the source root becomes one Markdown file."
        )
    )
    parser.add_argument(
        "source",
        type=Path,
        help="Source root to scan for Python files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help=(
            "Directory to write Markdown bundles into. "
            "Defaults to output/python-dir-bundles/<source-name>."
        ),
    )
    parser.add_argument(
        "--root-bundle-name",
        default="_root",
        help="Base filename to use for Python files that live directly under the source root.",
    )
    parser.add_argument(
        "--skip-root-files",
        action="store_true",
        help="Do not create a Markdown bundle for Python files that live directly under the source root.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the bundle plan without writing Markdown files.",
    )
    return parser.parse_args()


def is_ignored_dir(path: Path) -> bool:
    return path.name in IGNORED_DIR_NAMES or path.name.startswith(".")


def sanitize_filename(name: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "-", name.strip())
    sanitized = sanitized.strip("-.")
    return sanitized or "bundle"


def read_python_file(path: Path) -> str:
    with tokenize.open(path) as handle:
        return handle.read().rstrip()


def discover_bundles(
    source_root: Path,
    root_bundle_name: str,
    skip_root_files: bool,
) -> dict[str, list[Path]]:
    bundles: dict[str, list[Path]] = {}

    root_files = sorted([path for path in source_root.glob("*.py") if path.is_file()])
    if root_files and not skip_root_files:
        bundles[root_bundle_name] = root_files

    for child in sorted(source_root.iterdir(), key=lambda path: path.name.lower()):
        if not child.is_dir() or is_ignored_dir(child):
            continue

        files = sorted(
            [
                path
                for path in child.rglob("*.py")
                if path.is_file() and not any(is_ignored_dir(parent) for parent in path.parents if parent != source_root)
            ],
            key=lambda path: tuple(part.lower() for part in path.relative_to(child).parts),
        )
        if files:
            bundles[child.name] = files

    return bundles


def render_bundle_markdown(source_root: Path, bundle_name: str, files: list[Path]) -> str:
    lines: list[str] = [
        f"# Python Bundle: `{bundle_name}`",
        "",
        f"- Source root: `{source_root}`",
        f"- Python files: `{len(files)}`",
        "",
        "## Files",
        "",
    ]

    for path in files:
        relative = path.relative_to(source_root).as_posix()
        lines.append(f"- `{relative}`")

    lines.append("")

    for path in files:
        relative = path.relative_to(source_root).as_posix()
        lines.extend(
            [
                f"## `{relative}`",
                "",
                "```python",
                read_python_file(path),
                "```",
                "",
            ]
        )

    return "\n".join(lines).rstrip() + "\n"


def resolve_output_dir(source_root: Path, output_dir: Path | None) -> Path:
    if output_dir is not None:
        return output_dir

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    return project_root / "output" / "python-dir-bundles" / source_root.name


def main() -> int:
    args = parse_args()
    source_root = args.source.resolve()

    if not source_root.exists():
        raise SystemExit(f"Source directory does not exist: {source_root}")
    if not source_root.is_dir():
        raise SystemExit(f"Source path is not a directory: {source_root}")

    bundles = discover_bundles(source_root, args.root_bundle_name, args.skip_root_files)
    if not bundles:
        raise SystemExit(f"No Python files found under: {source_root}")

    output_dir = resolve_output_dir(source_root, args.output_dir)

    print(f"Source root: {source_root}")
    print(f"Output dir:  {output_dir}")
    print(f"Bundles:     {len(bundles)}")
    for bundle_name, files in bundles.items():
        output_path = output_dir / f"{sanitize_filename(bundle_name)}.md"
        print(f"- {bundle_name}: {len(files)} file(s) -> {output_path}")

    if args.dry_run:
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    for bundle_name, files in bundles.items():
        output_path = output_dir / f"{sanitize_filename(bundle_name)}.md"
        markdown = render_bundle_markdown(source_root, bundle_name, files)
        output_path.write_text(markdown, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

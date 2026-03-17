"""
Generate Python scaffolds from Java source using tree-sitter.

Replaces parse_kestra.py and parse_kestra_io.py with a unified,
3-stage deterministic pipeline:

  1. Parse Java with tree-sitter → FileInfo IR
  2. Build symbol registry + convert IR to scaffold model
  3. Emit Python source files

Usage:
  # Engine (Kestra core)
  python generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine

  # Integrations (Kestra plugins)
  python generate_scaffolds.py \\
    --source E:/KESTRA-IO/plugins \\
    --output integrations \\
    --prefix integrations \\
    --plugin-mode \\
    --engine-registry engine/.registry.json

  # Dry run
  python generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from integrations.javalang.pipeline.ts_extract import extract_file
from integrations.javalang.pipeline.symbol_registry import (
    SymbolRegistry, RegistryEntry, build_registry_from_files,
)
from integrations.javalang.pipeline.scaffold_builder import build_module
from integrations.javalang.pipeline.python_emitter import emit


def discover_module_files(source_root: Path) -> list[tuple[Path, Path, str]]:
    """Discover Java files in Kestra module layout.

    E:/KESTRA/{module}/src/main/java/io/kestra/{package}/...
    Returns: [(absolute_path, rel_from_io_kestra, module_name)]
    """
    files = []
    for module_dir in sorted(source_root.iterdir()):
        if not module_dir.is_dir():
            continue
        java_src = module_dir / "src" / "main" / "java" / "io" / "kestra"
        if not java_src.exists():
            continue
        for java_file in sorted(java_src.rglob("*.java")):
            if java_file.name == "package-info.java":
                continue
            rel = java_file.relative_to(java_src)
            files.append((java_file, rel, module_dir.name))
    return files


def discover_plugin_files(source_root: Path) -> list[tuple[Path, Path, str]]:
    """Discover Java files in Kestra plugin layout.

    E:/KESTRA-IO/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/...
    Strips the extra 'plugin/' from the path.
    Returns: [(absolute_path, rel_from_plugin_root, plugin_name)]
    """
    files = []
    for plugin_dir in sorted(source_root.iterdir()):
        if not plugin_dir.is_dir():
            continue
        java_src = plugin_dir / "src" / "main" / "java" / "io" / "kestra" / "plugin"
        if not java_src.exists():
            continue
        for java_file in sorted(java_src.rglob("*.java")):
            if java_file.name == "package-info.java":
                continue
            rel = java_file.relative_to(java_src)
            files.append((java_file, rel, plugin_dir.name))
    return files


def main():
    parser = argparse.ArgumentParser(description="Generate Python scaffolds from Java source")
    parser.add_argument("--source", type=Path, required=True, help="Java source root")
    parser.add_argument("--output", type=str, required=True, help="Output directory name")
    parser.add_argument("--prefix", type=str, required=True, help="Python package prefix")
    parser.add_argument("--plugin-mode", action="store_true", help="Use plugin discovery layout")
    parser.add_argument("--engine-registry", type=Path, help="Path to engine registry JSON")
    parser.add_argument("--dry-run", action="store_true", help="Run pipeline without writing files")
    parser.add_argument("--report-json", type=Path, help="Write JSON report to this path")
    parser.add_argument("--limit", type=int, help="Process only first N files")
    parser.add_argument("--fail-on-conflict", action="store_true", help="Exit if class name conflicts")
    args = parser.parse_args()

    output_root = PROJECT_ROOT / args.output
    source_root = args.source

    if not source_root.exists():
        print(f"ERROR: Source root does not exist: {source_root}")
        sys.exit(1)

    print(f"Source:  {source_root}")
    print(f"Output:  {output_root}")
    print(f"Prefix:  {args.prefix}")
    print(f"Mode:    {'plugin' if args.plugin_mode else 'module'}")
    if args.dry_run:
        print(f"DRY RUN — no files will be written")
    print()

    # --- Phase 1: Discover ---
    print("Phase 1: Discovering Java files...")
    if args.plugin_mode:
        files = discover_plugin_files(source_root)
    else:
        files = discover_module_files(source_root)

    if args.limit:
        files = files[:args.limit]

    modules = sorted(set(m for _, _, m in files))
    print(f"  Found {len(files)} files across {len(modules)} {'plugins' if args.plugin_mode else 'modules'}")

    # Module counts
    module_counts: dict[str, int] = {}
    for _, _, m in files:
        module_counts[m] = module_counts.get(m, 0) + 1
    for name, count in sorted(module_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"    {name}: {count}")
    if len(modules) > 10:
        print(f"    ... and {len(modules) - 10} more")
    print()

    # --- Phase 2: Parse ---
    print("Phase 2: Parsing with tree-sitter...")
    parsed: list[tuple[Path, Path, str, object]] = []
    parse_errors = 0

    for java_file, rel, module in files:
        try:
            src = java_file.read_text(encoding="utf-8", errors="replace")
            file_info = extract_file(src)
            parsed.append((java_file, rel, module, file_info))
        except Exception as e:
            parse_errors += 1
            if parse_errors <= 5:
                print(f"  PARSE ERROR: {java_file.name}: {e}")

    print(f"  Parsed: {len(parsed)}, Errors: {parse_errors}")
    print()

    # --- Phase 3: Build registry ---
    print("Phase 3: Building symbol registry...")
    registry = build_registry_from_files(
        [(jf, rel, mod) for jf, rel, mod, _ in parsed],
        args.prefix,
    )

    # Load engine registry if provided (for plugin cross-references)
    if args.engine_registry and args.engine_registry.exists():
        engine_reg = SymbolRegistry.from_json(args.engine_registry)
        # Merge: engine entries first (they take priority)
        for name, entries in engine_reg.entries.items():
            if name not in registry.entries:
                registry.entries[name] = entries
        print(f"  Loaded engine registry: {len(engine_reg)} symbols")

    registry.build_conflicts()
    conflicts = registry.conflicts
    print(f"  Registry: {len(registry)} symbols, {len(conflicts)} conflicts")

    if conflicts and args.fail_on_conflict:
        print(f"\nERROR: {len(conflicts)} class name conflicts exist")
        for name, paths in conflicts[:10]:
            print(f"  {name}: {', '.join(paths)}")
        sys.exit(1)

    if conflicts:
        for name, paths in conflicts[:5]:
            print(f"  CONFLICT: {name}: {', '.join(paths[:2])}")
        if len(conflicts) > 5:
            print(f"  ... and {len(conflicts) - 5} more")
    print()

    # --- Phase 4: Build scaffold models ---
    print("Phase 4: Building scaffold models...")
    modules_built: list[tuple[object, object]] = []
    build_errors = 0

    for java_file, rel, module, file_info in parsed:
        try:
            module_spec = build_module(file_info, java_file, rel, args.prefix, registry)
            modules_built.append((module_spec, file_info))
        except Exception as e:
            build_errors += 1
            if build_errors <= 5:
                print(f"  BUILD ERROR: {java_file.name}: {e}")

    print(f"  Built: {len(modules_built)}, Errors: {build_errors}")

    # Count types
    total_classes = sum(
        sum(1 for t in ms.types if t.kind == "class") for ms, _ in modules_built
    )
    total_interfaces = sum(
        sum(1 for t in ms.types if t.kind == "interface") for ms, _ in modules_built
    )
    total_enums = sum(
        sum(1 for t in ms.types if t.kind == "enum") for ms, _ in modules_built
    )
    total_records = sum(
        sum(1 for t in ms.types if t.kind == "record") for ms, _ in modules_built
    )
    total_fields = sum(
        sum(len(t.fields) for t in ms.types) for ms, _ in modules_built
    )
    total_methods = sum(
        sum(len(t.methods) for t in ms.types) for ms, _ in modules_built
    )
    total_warnings = sum(len(ms.warnings) for ms, _ in modules_built)

    print(f"  Types: {total_classes} classes, {total_interfaces} interfaces, "
          f"{total_enums} enums, {total_records} records")
    print(f"  Members: {total_fields} fields, {total_methods} methods")
    if total_warnings:
        print(f"  Warnings: {total_warnings}")
    print()

    # --- Phase 5: Emit ---
    print("Phase 5: Emitting Python source...")
    emitted: list[tuple[Path, str]] = []
    emit_errors = 0

    for module_spec, _ in modules_built:
        try:
            source = emit(module_spec)
            out_path = output_root / module_spec.file_path
            emitted.append((out_path, source))
        except Exception as e:
            emit_errors += 1
            if emit_errors <= 5:
                print(f"  EMIT ERROR: {module_spec.file_path}: {e}")

    print(f"  Emitted: {len(emitted)}, Errors: {emit_errors}")
    print()

    if args.dry_run:
        print("DRY RUN complete — no files written.")
        print(f"\nSummary:")
        print(f"  Would write {len(emitted)} Python files to {output_root}/")
        print(f"  Parse errors: {parse_errors}")
        print(f"  Build errors: {build_errors}")
        print(f"  Emit errors: {emit_errors}")
    else:
        # --- Phase 6: Write ---
        print("Phase 6: Writing files...")

        # Clean previous output (but don't delete non-scaffold content)
        if output_root.exists():
            # Preserve specific directories (like javalang/ in integrations)
            preserve = set()
            if args.prefix == "integrations":
                preserve.add(output_root / "javalang")
            for item in output_root.iterdir():
                if item not in preserve:
                    if item.is_dir():
                        shutil.rmtree(item)
                    elif item.name != "__init__.py":
                        item.unlink()

        written = 0
        for out_path, source in emitted:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(source, encoding="utf-8")
            written += 1

            # __init__.py
            init = out_path.parent / "__init__.py"
            if not init.exists():
                init.write_text("")

        # Ensure __init__.py everywhere
        for dirpath, _, _ in os.walk(output_root):
            init = Path(dirpath) / "__init__.py"
            if not init.exists():
                init.write_text("")

        print(f"  Written: {written} files")

        # Save registry
        reg_path = output_root / ".registry.json"
        registry.to_json(reg_path)
        print(f"  Registry saved: {reg_path}")

    # --- Report ---
    if args.report_json:
        report = {
            "source": str(source_root),
            "output": str(output_root),
            "prefix": args.prefix,
            "files_scanned": len(files),
            "files_parsed": len(parsed),
            "parse_errors": parse_errors,
            "modules_built": len(modules_built),
            "build_errors": build_errors,
            "files_emitted": len(emitted),
            "emit_errors": emit_errors,
            "types": {
                "classes": total_classes,
                "interfaces": total_interfaces,
                "enums": total_enums,
                "records": total_records,
            },
            "members": {
                "fields": total_fields,
                "methods": total_methods,
            },
            "conflicts": len(conflicts),
            "warnings": total_warnings,
        }
        args.report_json.parent.mkdir(parents=True, exist_ok=True)
        args.report_json.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nReport written: {args.report_json}")

    print("\nDone.")


if __name__ == "__main__":
    main()

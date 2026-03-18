from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


SEED_ROOT = Path(r"E:\writing-system\core\kestra-ref")
CORE_ROOT = Path(r"E:\kestra\core\src\main\java")
MODEL_ROOT = Path(r"E:\kestra\model\src\main\java")
OUTPUT_ROOT = Path(r"E:\writing-system\output\kestra-core-dependency-closure")

IMPORT_RE = re.compile(r"^\s*import\s+(io\.kestra\.core\.[\w\.]+);")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")


def imports_for(path: Path) -> set[str]:
    imports: set[str] = set()
    for line in read_text(path).splitlines():
        match = IMPORT_RE.match(line)
        if match:
            imports.add(match.group(1))
    return imports


def resolve_under(root: Path, import_name: str) -> Path | None:
    candidate = root / Path(*import_name.split(".")).with_suffix(".java")
    return candidate if candidate.exists() else None


def resolve_core(import_name: str) -> Path | None:
    return resolve_under(CORE_ROOT, import_name)


def resolve_model(import_name: str) -> Path | None:
    return resolve_under(MODEL_ROOT, import_name)


def build_core_closure(seed_files: list[Path]) -> tuple[set[Path], list[dict[str, str]], dict[str, set[str]]]:
    seen = {path.resolve() for path in seed_files}
    queue = list(seed_files)
    processed: set[Path] = set()
    edges: list[dict[str, str]] = []
    unresolved: dict[str, set[str]] = defaultdict(set)

    while queue:
        current = queue.pop(0)
        current_resolved = current.resolve()
        if current_resolved in processed:
            continue
        processed.add(current_resolved)

        for import_name in sorted(imports_for(current)):
            resolved = resolve_core(import_name)
            edges.append(
                {
                    "from_file": str(current),
                    "import": import_name,
                    "resolved_core_file": str(resolved) if resolved else "",
                    "resolved_in_core": "True" if resolved else "False",
                }
            )
            if resolved:
                resolved_path = resolved.resolve()
                if resolved_path not in seen:
                    seen.add(resolved_path)
                    queue.append(resolved)
            else:
                unresolved[import_name].add(str(current))

    return seen, edges, unresolved


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    seed_files = sorted(SEED_ROOT.rglob("*.java"))
    closure, edges, unresolved = build_core_closure(seed_files)

    core_dependency_files = sorted(
        path for path in closure if CORE_ROOT in path.parents or path == CORE_ROOT
    )

    supplemental_rows: list[dict[str, str]] = []
    nested_type_refs: list[dict[str, str]] = []

    for import_name in sorted(unresolved):
        model_file = resolve_model(import_name)
        if model_file:
            supplemental_rows.append(
                {
                    "import": import_name,
                    "kind": "model_file",
                    "actual_location": str(model_file),
                    "notes": "Lives under kestra/model instead of kestra/core",
                }
            )
            continue

        if import_name == "io.kestra.core.models.tasks.runners.TaskLogLineMatcher.TaskLogMatch":
            nested_type_refs.append(
                {
                    "import": import_name,
                    "container_file": str(
                        CORE_ROOT
                        / "io"
                        / "kestra"
                        / "core"
                        / "models"
                        / "tasks"
                        / "runners"
                        / "TaskLogLineMatcher.java"
                    ),
                    "notes": "Nested record inside TaskLogLineMatcher.java, not a standalone source file",
                }
            )
            continue

        supplemental_rows.append(
            {
                "import": import_name,
                "kind": "unresolved",
                "actual_location": "",
                "notes": "Not resolved under kestra/core or kestra/model",
            }
        )

    closure_rows = [{"file": str(path)} for path in core_dependency_files]
    unresolved_rows = [
        {
            "import": import_name,
            "referenced_from_count": str(len(refs)),
            "referenced_from": " | ".join(sorted(refs)),
        }
        for import_name, refs in sorted(unresolved.items())
    ]

    write_csv(OUTPUT_ROOT / "core_dependency_files.csv", ["file"], closure_rows)
    write_csv(
        OUTPUT_ROOT / "core_dependency_edges.csv",
        ["from_file", "import", "resolved_core_file", "resolved_in_core"],
        edges,
    )
    write_csv(
        OUTPUT_ROOT / "unresolved_or_supplemental.csv",
        ["import", "kind", "actual_location", "notes"],
        supplemental_rows,
    )
    write_csv(
        OUTPUT_ROOT / "nested_type_references.csv",
        ["import", "container_file", "notes"],
        nested_type_refs,
    )
    write_csv(
        OUTPUT_ROOT / "unresolved_import_references.csv",
        ["import", "referenced_from_count", "referenced_from"],
        unresolved_rows,
    )

    summary = {
        "seed_java_files": len(seed_files),
        "distinct_core_dependency_files": len(core_dependency_files),
        "distinct_model_dependency_files": sum(1 for row in supplemental_rows if row["kind"] == "model_file"),
        "nested_type_references": len(nested_type_refs),
        "unresolved_after_core_and_model_resolution": sum(
            1 for row in supplemental_rows if row["kind"] == "unresolved"
        ),
        "planning_scope_real_java_files": len(core_dependency_files)
        + sum(1 for row in supplemental_rows if row["kind"] == "model_file"),
    }

    with (OUTPUT_ROOT / "canonical_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    with (OUTPUT_ROOT / "canonical_summary.md").open("w", encoding="utf-8") as handle:
        handle.write("# Canonical Kestra Dependency Summary\n\n")
        handle.write("- Count only real `.java` files as planning scope.\n")
        handle.write("- Keep nested-type references separate from file counts.\n")
        handle.write("- Keep `kestra/model` supplements separate from `kestra/core` file counts.\n\n")
        for key, value in summary.items():
            handle.write(f"- {key}: {value}\n")

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

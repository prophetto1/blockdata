"""Build a dependency closure from Java source files by following imports."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from integrations.javalang.extract_imports import extract_imports


def _resolve_import_to_file(import_path: str, source_roots: list[Path]) -> Path | None:
    """Resolve a Java import like 'io.kestra.core.models.flows.Flow' to a file path."""
    rel = Path(*import_path.split("."))
    java_file = rel.with_suffix(".java")

    for root in source_roots:
        candidate = root / java_file
        if candidate.exists():
            return candidate
    return None


def build_dependency_closure(
    seed_files: list[str | Path],
    source_roots: list[str | Path],
    import_prefixes: list[str] | None = None,
) -> dict[str, Any]:
    """Recursively follow imports from seed files and build the full dependency graph.

    Args:
        seed_files: Starting Java files to trace from.
        source_roots: Directories to search for imported files
            (e.g., E:/KESTRA/core/src/main/java).
        import_prefixes: Only follow imports matching these prefixes
            (e.g., ["io.kestra.core", "io.kestra.plugin"]).
            If None, follows all imports.

    Returns:
        {
            "visited": ["io.kestra.core.models.flows.Flow", ...],
            "edges": [{"from": "...", "to": "..."}, ...],
            "unresolved": ["com.google.common.collect.ImmutableList", ...],
            "file_count": 42,
            "edge_count": 128,
        }
    """
    roots = [Path(r) for r in source_roots]
    prefixes = import_prefixes or []

    visited: set[str] = set()
    edges: list[dict[str, str]] = []
    unresolved: set[str] = set()
    queue: list[Path] = []

    # Map file paths back to import paths for tracking
    file_to_import: dict[Path, str] = {}

    # Seed the queue
    for seed in seed_files:
        seed_path = Path(seed)
        if seed_path.exists():
            queue.append(seed_path)
            # Derive import path from file path relative to source roots
            for root in roots:
                try:
                    rel = seed_path.relative_to(root)
                    import_path = ".".join(rel.with_suffix("").parts)
                    file_to_import[seed_path] = import_path
                    visited.add(import_path)
                    break
                except ValueError:
                    continue

    while queue:
        current_file = queue.pop(0)
        current_import = file_to_import.get(current_file, str(current_file))

        try:
            code = current_file.read_text(encoding="utf-8", errors="replace")
            result = extract_imports(code)
        except Exception:
            continue

        for imp in result["imports"]:
            # Filter by prefix if specified
            if prefixes and not any(imp.startswith(p) for p in prefixes):
                continue

            edges.append({"from": current_import, "to": imp})

            if imp in visited:
                continue

            resolved = _resolve_import_to_file(imp, roots)
            if resolved:
                visited.add(imp)
                file_to_import[resolved] = imp
                queue.append(resolved)
            else:
                unresolved.add(imp)

    return {
        "visited": sorted(visited),
        "edges": edges,
        "unresolved": sorted(unresolved),
        "file_count": len(visited),
        "edge_count": len(edges),
    }

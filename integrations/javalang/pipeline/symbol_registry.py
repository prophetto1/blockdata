"""
Symbol registry — maps Java class names to Python importable paths.

Handles class name conflicts by using Java import statements from the
source file to disambiguate. Supports serialization for incremental runs.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")


def _to_snake(name: str) -> str:
    return CAMEL_RE.sub("_", name).lower()


@dataclass
class RegistryEntry:
    """A single symbol in the registry."""
    class_name: str
    module_path: str       # e.g., "engine.core.models.flows.flow"
    source_file: str       # absolute path to Java file
    source_module: str     # Kestra module name (core, webserver, etc.)
    kind: str              # class | interface | enum | record
    java_fqn: str          # e.g., "io.kestra.core.models.flows.Flow"


@dataclass
class SymbolRegistry:
    """Maps class names to their Python module paths."""
    entries: dict[str, list[RegistryEntry]] = field(default_factory=dict)
    _conflicts: list[tuple[str, list[str]]] = field(default_factory=list)

    def add(self, entry: RegistryEntry):
        if entry.class_name not in self.entries:
            self.entries[entry.class_name] = []
        self.entries[entry.class_name].append(entry)

    def build_conflicts(self):
        """Identify class names with multiple locations."""
        self._conflicts = []
        for name, entries in self.entries.items():
            paths = list(set(e.module_path for e in entries))
            if len(paths) > 1:
                self._conflicts.append((name, paths))

    @property
    def conflicts(self) -> list[tuple[str, list[str]]]:
        return self._conflicts

    def resolve(self, class_name: str, java_imports: list[str] | None = None) -> str | None:
        """Resolve a class name to its Python module path.

        Uses Java import statements to disambiguate when multiple
        entries exist for the same class name.
        """
        entries = self.entries.get(class_name)
        if not entries:
            return None

        if len(entries) == 1:
            return entries[0].module_path

        # Multiple entries — try to disambiguate via Java imports
        if java_imports:
            for entry in entries:
                # Check if any Java import matches this entry's FQN
                if entry.java_fqn in java_imports:
                    return entry.module_path

        # Fallback: return the first entry (deterministic since entries
        # are added in sorted file order)
        return entries[0].module_path

    def resolve_with_alias(
        self, class_name: str, java_imports: list[str] | None = None
    ) -> tuple[str | None, str | None]:
        """Resolve and return (module_path, alias_or_None)."""
        module_path = self.resolve(class_name, java_imports)
        if module_path is None:
            return None, None
        # No alias needed unless there's a conflict with a local name
        return module_path, None

    def to_json(self, path: Path):
        """Serialize registry to JSON."""
        data = {}
        for name, entries in sorted(self.entries.items()):
            data[name] = [
                {
                    "class_name": e.class_name,
                    "module_path": e.module_path,
                    "source_file": e.source_file,
                    "source_module": e.source_module,
                    "kind": e.kind,
                    "java_fqn": e.java_fqn,
                }
                for e in entries
            ]
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    @classmethod
    def from_json(cls, path: Path) -> SymbolRegistry:
        """Deserialize registry from JSON."""
        reg = cls()
        data = json.loads(path.read_text(encoding="utf-8"))
        for name, entries in data.items():
            for e in entries:
                reg.add(RegistryEntry(**e))
        reg.build_conflicts()
        return reg

    def __len__(self) -> int:
        return len(self.entries)


def build_registry_from_files(
    java_files: list[tuple[Path, Path, str]],
    prefix: str,
    java_root_key: str = "io/kestra",
) -> SymbolRegistry:
    """Build a registry from a list of (java_file, rel_path, module_name) tuples.

    Args:
        java_files: List of (absolute_path, relative_path, module_name).
        prefix: Package prefix (e.g., "engine" or "integrations").
        java_root_key: The Java package root to strip for FQN construction.
    """
    registry = SymbolRegistry()

    for java_file, rel, module_name in java_files:
        class_name = java_file.stem
        py_module = _to_snake(class_name)
        parts = [prefix] + list(rel.parent.parts) + [py_module]
        module_path = ".".join(parts)

        # Build Java FQN from relative path
        fqn_parts = list(rel.parent.parts) + [class_name]
        java_fqn = "io.kestra." + ".".join(fqn_parts)

        # Determine kind from file content would require parsing,
        # so default to "class" — scaffold_builder will update
        registry.add(RegistryEntry(
            class_name=class_name,
            module_path=module_path,
            source_file=str(java_file),
            source_module=module_name,
            kind="class",
            java_fqn=java_fqn,
        ))

    registry.build_conflicts()
    return registry
"""Extract import statements from Java source."""

from __future__ import annotations

from integrations.javalang.service import parse_tree


def extract_imports(code: str) -> dict:
    """Parse Java source and return all import statements.

    Returns:
        {
            "imports": ["io.kestra.core.models.tasks.Task", ...],
            "wildcard_imports": ["io.kestra.core.models.*", ...],
            "static_imports": ["io.kestra.core.utils.Rethrow.throwConsumer", ...],
            "count": 12,
        }
    """
    tree = parse_tree(code)

    imports = []
    wildcard_imports = []
    static_imports = []

    if tree.imports:
        for imp in tree.imports:
            path = imp.path
            if imp.static:
                static_imports.append(path)
            elif imp.wildcard:
                wildcard_imports.append(path)
            else:
                imports.append(path)

    return {
        "imports": imports,
        "wildcard_imports": wildcard_imports,
        "static_imports": static_imports,
        "count": len(imports) + len(wildcard_imports) + len(static_imports),
    }

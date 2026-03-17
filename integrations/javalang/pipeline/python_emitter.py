"""
Python emitter — takes a ModuleSpec and produces a Python source string.

Pure formatting. No decisions, no lookups, no type inference.
Deterministic: same ModuleSpec always produces identical output.
"""

from __future__ import annotations

from integrations.javalang.pipeline.scaffold_model import (
    ModuleSpec, ImportSpec, ClassSpec, FieldSpec, MethodSpec, ParamSpec,
)


def emit(module: ModuleSpec) -> str:
    """Emit a complete Python module from a ModuleSpec."""
    lines: list[str] = []

    # 1. Future imports
    for fi in module.future_imports:
        lines.append(f"from __future__ import {fi}")
    lines.append("")

    # 2. Source reference
    lines.append(f"# Source: {module.source_file}")

    # 3. Module docstring
    if module.module_docstring:
        lines.append(f'"""{module.module_docstring}"""')

    # 4. Warnings as comments
    for w in module.warnings:
        lines.append(f"# WARNING: {w}")

    lines.append("")

    # 5. Imports — grouped by kind
    stdlib_imports = [i for i in module.imports if i.kind == "stdlib"]
    typing_imports = [i for i in module.imports if i.kind == "typing"]
    cross_imports = [i for i in module.imports if i.kind == "cross_file"]

    for imp in stdlib_imports + typing_imports:
        lines.append(_format_import(imp))

    if stdlib_imports or typing_imports:
        if cross_imports:
            lines.append("")

    for imp in cross_imports:
        lines.append(_format_import(imp))

    lines.append("")
    lines.append("")

    # 6. Type definitions
    for i, type_spec in enumerate(module.types):
        type_lines = _emit_type(type_spec, indent="")
        lines.extend(type_lines)
        if i < len(module.types) - 1:
            lines.append("")
            lines.append("")

    # Clean trailing blank lines, ensure single trailing newline
    while lines and lines[-1] == "":
        lines.pop()
    lines.append("")

    return "\n".join(lines)


def _format_import(imp: ImportSpec) -> str:
    """Format a single import statement."""
    if imp.alias:
        return f"from {imp.module} import {imp.name} as {imp.alias}"
    return f"from {imp.module} import {imp.name}"


def _emit_type(spec: ClassSpec, indent: str) -> list[str]:
    """Emit a class/interface/enum/record."""
    if spec.style == "enum":
        return _emit_enum(spec, indent)
    elif spec.style == "protocol":
        return _emit_protocol(spec, indent)
    else:
        return _emit_dataclass(spec, indent)


def _emit_enum(spec: ClassSpec, indent: str) -> list[str]:
    lines: list[str] = []
    bases = f"({', '.join(spec.bases)})" if spec.bases else "(str, Enum)"
    lines.append(f"{indent}class {spec.name}{bases}:")

    if spec.docstring:
        lines.append(f'{indent}    """{spec.docstring}"""')

    if spec.enum_members:
        for member in spec.enum_members:
            lines.append(f'{indent}    {member} = "{member}"')
    else:
        lines.append(f"{indent}    pass")

    # Enum methods
    for method in spec.methods:
        lines.append("")
        lines.extend(_emit_method(method, indent + "    "))

    return lines


def _emit_protocol(spec: ClassSpec, indent: str) -> list[str]:
    lines: list[str] = []
    bases = f"({', '.join(spec.bases)})" if spec.bases else "(Protocol)"
    lines.append(f"{indent}class {spec.name}{bases}:")

    if spec.docstring:
        lines.append(f'{indent}    """{spec.docstring}"""')

    has_content = False

    for method in spec.methods:
        if has_content:
            lines.append("")
        lines.extend(_emit_protocol_method(method, indent + "    "))
        has_content = True

    if not has_content:
        lines.append(f"{indent}    pass")

    return lines


def _emit_dataclass(spec: ClassSpec, indent: str) -> list[str]:
    lines: list[str] = []

    # Decorators
    for dec in spec.decorators:
        lines.append(f"{indent}{dec.expr}")

    # Class declaration
    bases = f"({', '.join(spec.bases)})" if spec.bases else ""
    lines.append(f"{indent}class {spec.name}{bases}:")

    # Docstring
    if spec.docstring:
        lines.append(f'{indent}    """{spec.docstring}"""')

    has_content = False
    inner_indent = indent + "    "

    # Fields — required first, then optional
    required_fields = [f for f in spec.fields if not f.is_optional and f.default_expr is None and f.default_factory is None]
    defaulted_fields = [f for f in spec.fields if f.default_expr is not None or f.default_factory is not None]
    optional_fields = [f for f in spec.fields if f.is_optional and f not in defaulted_fields]

    for f in required_fields:
        lines.append(_emit_field(f, inner_indent))
        has_content = True

    for f in defaulted_fields:
        lines.append(_emit_field(f, inner_indent))
        has_content = True

    for f in optional_fields:
        lines.append(_emit_field(f, inner_indent))
        has_content = True

    # Methods
    for method in spec.methods:
        lines.append("")
        lines.extend(_emit_method(method, inner_indent))
        has_content = True

    # Inner classes
    for inner in spec.inner_classes:
        lines.append("")
        lines.extend(_emit_type(inner, inner_indent))
        has_content = True

    if not has_content:
        lines.append(f"{indent}    pass")

    return lines


def _emit_field(spec: FieldSpec, indent: str) -> str:
    """Emit a single field declaration."""
    if spec.is_class_var:
        if spec.default_expr is not None:
            return f"{indent}{spec.name}: ClassVar[{spec.type_str}] = {spec.default_expr}"
        return f"{indent}{spec.name}: ClassVar[{spec.type_str}]"

    if spec.default_factory is not None:
        return f"{indent}{spec.name}: {spec.type_str} = field(default_factory={spec.default_factory})"

    if spec.default_expr is not None:
        return f"{indent}{spec.name}: {spec.type_str} = {spec.default_expr}"

    if spec.is_optional:
        return f"{indent}{spec.name}: {spec.type_str} | None = None"

    return f"{indent}{spec.name}: {spec.type_str}"


def _emit_method(spec: MethodSpec, indent: str) -> list[str]:
    """Emit a method with body."""
    lines: list[str] = []

    # Decorators
    for dec in spec.decorators:
        lines.append(f"{indent}{dec.expr}")

    # Signature
    params = _format_params(spec)
    lines.append(f"{indent}def {spec.name}({params}) -> {spec.return_type}:")

    # Docstring
    if spec.docstring:
        lines.append(f'{indent}    """{spec.docstring}"""')

    # Body
    if spec.body_lines:
        for bl in spec.body_lines:
            lines.append(f"{indent}    {bl}")
    else:
        lines.append(f"{indent}    pass")

    return lines


def _emit_protocol_method(spec: MethodSpec, indent: str) -> list[str]:
    """Emit a protocol method (abstract, no body — just ...)."""
    lines: list[str] = []
    params = _format_params(spec)
    lines.append(f"{indent}def {spec.name}({params}) -> {spec.return_type}: ...")
    return lines


def _format_params(spec: MethodSpec) -> str:
    """Format method parameters including self."""
    parts: list[str] = []

    if spec.kind == "instance":
        parts.append("self")
    elif spec.kind == "classmethod":
        parts.append("cls")
    # static methods have no self/cls

    for p in spec.params:
        if p.default_expr is not None:
            parts.append(f"{p.name}: {p.type_str} = {p.default_expr}")
        elif p.is_varargs:
            parts.append(f"*{p.name}: {p.type_str}")
        elif p.is_kwargs:
            parts.append(f"**{p.name}: {p.type_str}")
        else:
            parts.append(f"{p.name}: {p.type_str}")

    return ", ".join(parts)

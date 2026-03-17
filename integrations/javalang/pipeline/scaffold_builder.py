"""
Scaffold builder — transforms FileInfo + SymbolRegistry into ModuleSpec.

All intelligence lives here: type mapping, name conversion, import resolution,
classification of classes vs protocols vs enums, field defaults, method signatures.
"""

from __future__ import annotations

import re
from pathlib import Path

from integrations.javalang.pipeline.ts_extract import FileInfo, TypeInfo, FieldInfo, MethodInfo, ParamInfo
from integrations.javalang.pipeline.scaffold_model import (
    ModuleSpec, ImportSpec, ClassSpec, FieldSpec, MethodSpec,
    ParamSpec, DecoratorSpec,
)
from integrations.javalang.pipeline.symbol_registry import SymbolRegistry

CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")

# --- Type mapping ---

JAVA_TO_PYTHON_TYPES = {
    "String": "str", "Integer": "int", "int": "int",
    "Long": "int", "long": "int", "Short": "int", "short": "int",
    "Byte": "int", "byte": "int", "Character": "char", "char": "str",
    "Double": "float", "double": "float",
    "Float": "float", "float": "float",
    "Boolean": "bool", "boolean": "bool",
    "void": "None", "Object": "Any",
    "List": "list", "ArrayList": "list", "LinkedList": "list",
    "Map": "dict", "HashMap": "dict", "LinkedHashMap": "dict", "TreeMap": "dict",
    "Set": "set", "HashSet": "set", "TreeSet": "set",
    "Collection": "list", "Iterable": "list",
    "Optional": "Optional",
    "URI": "str", "URL": "str",
    "Duration": "timedelta",
    "Instant": "datetime", "ZonedDateTime": "datetime",
    "LocalDate": "date", "LocalTime": "time", "LocalDateTime": "datetime",
    "Path": "Path", "File": "Path",
    "byte[]": "bytes",
    "BigDecimal": "float", "BigInteger": "int",
    "UUID": "str",
}

STDLIB_TYPE_IMPORTS: dict[str, ImportSpec] = {
    "timedelta": ImportSpec(module="datetime", name="timedelta", kind="stdlib"),
    "datetime": ImportSpec(module="datetime", name="datetime", kind="stdlib"),
    "date": ImportSpec(module="datetime", name="date", kind="stdlib"),
    "time": ImportSpec(module="datetime", name="time", kind="stdlib"),
    "Path": ImportSpec(module="pathlib", name="Path", kind="stdlib"),
}

# Java types that map to stdlib types needing imports
JAVA_STDLIB_TRIGGERS: dict[str, str] = {
    "Duration": "timedelta",
    "Instant": "datetime",
    "ZonedDateTime": "datetime",
    "LocalDate": "date",
    "LocalTime": "time",
    "LocalDateTime": "datetime",
    "Path": "Path",
    "File": "Path",
}


def _to_snake(name: str) -> str:
    return CAMEL_RE.sub("_", name).lower()


def _map_type(java_type: str) -> str:
    """Map a Java type string to Python."""
    if not java_type or java_type == "Any":
        return "Any"

    # Handle generics: Type[A, B]
    if "[" in java_type:
        base = java_type[:java_type.index("[")]
        inner = java_type[java_type.index("[") + 1:-1]
        mapped_base = JAVA_TO_PYTHON_TYPES.get(base, base)
        # Map inner types recursively
        inner_parts = _split_generic_args(inner)
        mapped_inner = ", ".join(_map_type(p.strip()) for p in inner_parts)
        return f"{mapped_base}[{mapped_inner}]"

    # Handle arrays
    if java_type.endswith("[]"):
        element = java_type[:-2]
        return f"list[{_map_type(element)}]"

    # Handle Property wrapper
    if java_type.startswith("Property["):
        inner = java_type[9:-1]
        return f"Property[{_map_type(inner)}]"

    # Simple mapping
    return JAVA_TO_PYTHON_TYPES.get(java_type, java_type)


def _split_generic_args(s: str) -> list[str]:
    """Split generic arguments respecting nesting: 'A, B[C, D]' → ['A', 'B[C, D]']."""
    parts = []
    depth = 0
    current = []
    for ch in s:
        if ch == "[":
            depth += 1
            current.append(ch)
        elif ch == "]":
            depth -= 1
            current.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        parts.append("".join(current).strip())
    return parts


def _map_default(value: str | None, type_str: str) -> tuple[str | None, str | None]:
    """Map a Java default value to (default_expr, default_factory).

    Returns (expr, None) for simple defaults, (None, factory) for collection defaults.
    """
    if value is None:
        return None, None

    # Boolean
    if value == "true" or value == "True":
        return "True", None
    if value == "false" or value == "False":
        return "False", None
    if value == "null" or value == "None":
        return "None", None

    # Collection constructors
    stripped = value.strip()
    if stripped.startswith("new ArrayList") or stripped.startswith("new LinkedList"):
        return None, "list"
    if stripped.startswith("new HashMap") or stripped.startswith("new LinkedHashMap"):
        return None, "dict"
    if stripped.startswith("new HashSet"):
        return None, "set"

    # Numeric literals
    if re.match(r'^-?\d+[lLfFdD]?$', stripped):
        return stripped.rstrip("lLfFdD"), None

    # String literals
    if stripped.startswith('"') and stripped.endswith('"'):
        return stripped, None

    # Enum references, method calls, etc. — keep as-is
    return stripped, None


def _build_field(fi: FieldInfo, is_static: bool = False) -> FieldSpec:
    """Convert a tree-sitter FieldInfo to a scaffold FieldSpec."""
    name = _to_snake(fi.name)
    type_str = _map_type(fi.type_str)
    is_optional = not fi.is_required and not fi.has_default
    default_expr, default_factory = _map_default(fi.default_value, type_str)

    # If field has a default, it's not optional in the `| None = None` sense
    if fi.has_default and default_expr is not None:
        is_optional = False

    return FieldSpec(
        name=name,
        type_str=type_str,
        original_name=fi.name,
        default_expr=default_expr,
        default_factory=default_factory,
        is_optional=is_optional,
        is_class_var=is_static,
        is_init=not is_static,
    )


def _build_param(pi: ParamInfo) -> ParamSpec:
    """Convert a tree-sitter ParamInfo to a scaffold ParamSpec."""
    return ParamSpec(
        name=_to_snake(pi.name),
        type_str=_map_type(pi.type_str),
        original_name=pi.name,
    )


def _build_method(mi: MethodInfo) -> MethodSpec:
    """Convert a tree-sitter MethodInfo to a scaffold MethodSpec."""
    kind = "static" if mi.is_static else "instance"
    decorators = []
    if mi.is_static:
        decorators.append(DecoratorSpec(expr="@staticmethod"))

    return MethodSpec(
        name=_to_snake(mi.name),
        original_name=mi.name,
        return_type=_map_type(mi.return_type),
        params=[_build_param(p) for p in mi.parameters],
        kind=kind,
        is_abstract=False,
        raises_not_implemented=True,
        decorators=decorators,
        body_lines=["raise NotImplementedError  # TODO: translate from Java"],
    )


def _build_class(ti: TypeInfo) -> ClassSpec:
    """Convert a tree-sitter TypeInfo to a scaffold ClassSpec."""
    # Determine style
    if ti.kind == "enum":
        style = "enum"
    elif ti.kind == "interface":
        style = "protocol"
    else:
        style = "dataclass"

    # Decorators
    decorators = []
    if style == "dataclass":
        decorators.append(DecoratorSpec(expr="@dataclass(slots=True, kw_only=True)"))

    # Bases
    bases = list(ti.extends)
    if ti.kind == "interface" and not ti.extends:
        bases = ["Protocol"]
    if ti.kind != "interface":
        bases.extend(ti.implements)

    # Fields
    fields = [_build_field(f) for f in ti.fields]

    # Methods (skip setters — already filtered in ts_extract)
    methods = [_build_method(m) for m in ti.methods]

    # Inner classes
    inner = [_build_class(it) for it in ti.inner_types]
    for ic in inner:
        # Inner classes use simpler decorator
        if ic.style == "dataclass":
            ic.decorators = [DecoratorSpec(expr="@dataclass(slots=True)")]

    # Source metadata
    source_meta: dict = {}
    if ti.kind == "record":
        source_meta["java_kind"] = "record"
    if ti.kind == "annotation":
        source_meta["java_kind"] = "annotation"

    return ClassSpec(
        name=ti.name,
        source_name=ti.name,
        kind=ti.kind,
        style=style,
        bases=bases,
        is_abstract=False,
        is_final=False,
        decorators=decorators,
        docstring=ti.schema_title,
        fields=fields,
        methods=methods,
        enum_members=ti.enum_constants,
        inner_classes=inner,
        source_meta=source_meta,
    )


def build_module(
    file_info: FileInfo,
    java_file: Path,
    rel_path: Path,
    prefix: str,
    registry: SymbolRegistry,
) -> ModuleSpec:
    """Transform a FileInfo into a ModuleSpec ready for emission.

    Args:
        file_info: Parsed Java file info from tree-sitter.
        java_file: Absolute path to the Java source file.
        rel_path: Relative path from the Java root (e.g., core/models/flows/Flow.java).
        prefix: Package prefix ("engine" or "integrations").
        registry: Symbol registry for import resolution.
    """
    # Output path
    py_name = _to_snake(rel_path.stem) + ".py"
    out_rel = rel_path.parent / py_name
    module_parts = [prefix] + list(rel_path.parent.parts) + [_to_snake(rel_path.stem)]
    module_path = ".".join(module_parts)

    # Build types
    types = [_build_class(t) for t in file_info.types]

    # Collect local names (defined in this file)
    local_names = {t.name for t in file_info.types}
    for t in file_info.types:
        for ic in t.inner_types:
            local_names.add(ic.name)

    # Collect referenced types
    referenced = file_info.referenced_types - local_names

    # Remove Java builtins
    referenced -= set(JAVA_TO_PYTHON_TYPES.keys())

    # Determine what imports are needed
    imports: list[ImportSpec] = []
    stdlib_needed: set[str] = set()
    warnings: list[str] = []
    unresolved_types: list[str] = []

    # Check for stdlib type triggers
    for ref in file_info.referenced_types:
        if ref in JAVA_STDLIB_TRIGGERS:
            py_type = JAVA_STDLIB_TRIGGERS[ref]
            if py_type in STDLIB_TYPE_IMPORTS:
                stdlib_needed.add(py_type)

    for py_type in sorted(stdlib_needed):
        imports.append(STDLIB_TYPE_IMPORTS[py_type])

    # Resolve cross-file imports
    for name in sorted(referenced):
        resolved = registry.resolve(name, file_info.imports)
        if resolved and resolved != module_path:
            imports.append(ImportSpec(
                module=resolved,
                name=name,
                kind="cross_file",
            ))
        elif resolved is None and name not in JAVA_TO_PYTHON_TYPES:
            unresolved_types.append(name)

    # Determine structural imports
    needs_dataclass = any(t.style == "dataclass" for t in types)
    needs_field = any(
        f.default_factory is not None
        for t in types for f in t.fields
    )
    needs_enum = any(t.style == "enum" for t in types)
    needs_protocol = any(t.style == "protocol" for t in types)

    typing_imports: list[ImportSpec] = []
    if needs_dataclass:
        names = "dataclass, field" if needs_field else "dataclass"
        typing_imports.append(ImportSpec(module="dataclasses", name=names, kind="stdlib"))
    if needs_enum:
        typing_imports.append(ImportSpec(module="enum", name="Enum", kind="stdlib"))
    if needs_protocol:
        typing_imports.append(ImportSpec(module="typing", name="Any, Protocol", kind="typing"))
    else:
        typing_imports.append(ImportSpec(module="typing", name="Any", kind="typing"))

    # Combine: stdlib first, then typing, then cross-file
    all_imports = typing_imports + [i for i in imports if i.kind == "stdlib"] + \
                  [i for i in imports if i.kind == "cross_file"]

    if unresolved_types:
        warnings.append(f"Unresolved types: {', '.join(sorted(unresolved_types))}")

    return ModuleSpec(
        file_path=Path(out_rel),
        module_path=module_path,
        source_file=str(java_file),
        imports=all_imports,
        types=types,
        warnings=warnings,
    )

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

UPPER_SNAKE_RE = re.compile(r'^[A-Z][A-Z0-9_]*$')

# --- Type mapping ---

JAVA_TO_PYTHON_TYPES = {
    # Primitives and wrappers
    "String": "str", "Integer": "int", "int": "int",
    "Long": "int", "long": "int", "Short": "int", "short": "int",
    "Byte": "int", "byte": "int", "Character": "str", "char": "str",
    "Double": "float", "double": "float",
    "Float": "float", "float": "float",
    "Boolean": "bool", "boolean": "bool",
    "void": "None", "Object": "Any",
    # Collections
    "List": "list", "ArrayList": "list", "LinkedList": "list",
    "Map": "dict", "HashMap": "dict", "LinkedHashMap": "dict", "TreeMap": "dict",
    "Set": "set", "HashSet": "set", "TreeSet": "set", "LinkedHashSet": "set",
    "Collection": "list", "Iterable": "Iterable", "Iterator": "Iterator",
    "Queue": "list", "Deque": "list", "ArrayDeque": "list",
    "Optional": "Optional",
    # Strings and identifiers
    "URI": "str", "URL": "str", "UUID": "str",
    "StringBuilder": "str", "StringBuffer": "str", "CharSequence": "str",
    # Date/time
    "Duration": "timedelta",
    "Instant": "datetime", "ZonedDateTime": "datetime",
    "LocalDate": "date", "LocalTime": "time", "LocalDateTime": "datetime",
    # IO
    "Path": "Path", "File": "Path",
    "byte[]": "bytes",
    "InputStream": "Any", "OutputStream": "Any",
    # Numeric
    "BigDecimal": "float", "BigInteger": "int",
    "Number": "float", "AtomicInteger": "int", "AtomicLong": "int",
    "AtomicBoolean": "bool",
    # Functional interfaces
    "Runnable": "Callable", "Callable": "Callable",
    "Supplier": "Callable", "Consumer": "Callable",
    "Function": "Callable", "BiFunction": "Callable",
    "Predicate": "Callable", "BiConsumer": "Callable",
    "BiPredicate": "Callable", "UnaryOperator": "Callable",
    "BinaryOperator": "Callable",
    # Streams and concurrency
    "Stream": "Iterator", "Collector": "Any", "Collectors": "Any",
    "CompletableFuture": "Any", "Future": "Any",
    # Exceptions
    "Exception": "Exception", "RuntimeException": "RuntimeError",
    "IOException": "IOError", "IllegalStateException": "RuntimeError",
    "IllegalArgumentException": "ValueError",
    "NullPointerException": "TypeError",
    "UnsupportedOperationException": "NotImplementedError",
    "ConstraintViolationException": "ValueError",
    "InterruptedException": "KeyboardInterrupt",
    "TimeoutException": "TimeoutError",
    "Throwable": "BaseException",
    # Reflection and class
    "Class": "type", "Enum": "type",
    # Logging
    "Logger": "Any", "Level": "int",
    # Patterns
    "Pattern": "re.Pattern", "Matcher": "re.Match",
    # Serialization
    "Serializable": "Any", "Closeable": "Any", "AutoCloseable": "Any",
    "Comparable": "Any", "Cloneable": "Any",
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

# Package name fragments that leak from scoped type identifiers (not real types)
_PACKAGE_FRAGMENTS = {
    "io", "kestra", "core", "models", "tasks", "jdbc", "plugin", "runners",
    "webserver", "services", "controllers", "api", "flows", "executions",
    "utils", "events", "secret", "storage", "storages", "http", "client",
    "configurations", "annotations", "validations", "serializers", "docs",
    "triggers", "listeners", "dashboards", "filters", "charts", "condition",
    "scripts", "runner", "worker", "executor", "scheduler", "repository",
}

# External framework types with no Python equivalent — suppress to avoid warnings
_EXTERNAL_FRAMEWORK_TYPES = {
    # Micronaut
    "ApplicationContext", "ApplicationEventPublisher", "BeanContext",
    "Inject", "Singleton", "Value", "Property",
    # Jackson / JSON
    "ObjectMapper", "JsonNode", "JsonInclude", "JsonGenerator",
    "JsonSerializer", "JsonDeserializer", "ObjectNode", "ArrayNode",
    "JacksonAnnotationIntrospector", "SerializationFeature",
    # Jakarta validation
    "ConstraintValidator", "ConstraintValidatorContext", "AnnotationValue",
    # HTTP / web
    "HttpResponse", "HttpRequest", "HttpStatus", "HttpStatusException",
    "CompletedFileUpload", "Flux", "Mono", "Pageable",
    # Pebble templating
    "PebbleTemplate", "PebbleException", "EvaluationContext",
    # JOOQ / SQL
    "DSLContext", "Field", "Fields", "Record", "Condition", "Table",
    "SelectConditionStep", "SelectJoinStep", "Result",
    # Logback
    "ILoggingEvent", "LoggingEvent", "ThrowableProxy",
    # Swagger
    "Schema", "Hidden",
    # Guava
    "ImmutableMap", "ImmutableList", "ImmutableSet",
    # Misc framework
    "Payload", "Filter", "GroupType", "Date",
}


def _to_snake(name: str) -> str:
    """Convert Java name to Python snake_case.

    Handles camelCase, UPPER_SNAKE_CASE, and abbreviations like URL, SLA.
    """
    if UPPER_SNAKE_RE.match(name):
        return name.lower()
    # Insert _ between: lowercase/digit and uppercase, or abbreviation and next word
    # e.g. getURL -> get_URL, HTMLParser -> HTML_Parser, flowId -> flow_Id
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name)
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', s)
    return s.lower()


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


# Pattern for Java expressions that cannot be valid Python
_JAVA_EXPR_RE = re.compile(
    r'new\s+'           # new keyword
    r'|\.class\b'       # .class reflection
    r'|@\w+'            # annotations
    r'|\)\s*\{'         # anonymous class body
    r'|\(\)\s*\.'       # method chain: foo().bar()
)

# Simple enum-style references: Type.VALUE (no parens, no chains)
_SIMPLE_REF_RE = re.compile(r'^[A-Za-z_]\w*\.[A-Z_][A-Z0-9_]*$')


def _map_default(value: str | None, type_str: str) -> tuple[str | None, str | None]:
    """Map a Java default value to (default_expr, default_factory).

    Returns (expr, None) for simple defaults, (None, factory) for collection defaults.
    Drops untranslatable Java expressions (method chains, new, reflection).
    """
    if value is None:
        return None, None

    # Boolean
    if value in ("true", "True"):
        return "True", None
    if value in ("false", "False"):
        return "False", None
    if value in ("null", "None"):
        return "None", None

    stripped = value.strip()

    # Collection constructors
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

    # Simple enum references: Type.VALUE
    if _SIMPLE_REF_RE.match(stripped):
        return stripped, None

    # Drop anything that looks like untranslatable Java
    if _JAVA_EXPR_RE.search(stripped):
        return None, None

    # Drop method calls we can't translate
    if '(' in stripped:
        return None, None

    # Simple identifier or literal — keep
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
    is_abstract = mi.is_abstract
    decorators = []
    if mi.is_static:
        decorators.append(DecoratorSpec(expr="@staticmethod"))
    if is_abstract:
        decorators.append(DecoratorSpec(expr="@abstractmethod"))

    if is_abstract:
        body_lines = []
        raises = False
    else:
        body_lines = ["raise NotImplementedError  # TODO: translate from Java"]
        raises = True

    return MethodSpec(
        name=_to_snake(mi.name),
        original_name=mi.name,
        return_type=_map_type(mi.return_type),
        params=[_build_param(p) for p in mi.parameters],
        kind=kind,
        is_abstract=is_abstract,
        raises_not_implemented=raises,
        decorators=decorators,
        body_lines=body_lines,
    )


def _infer_with_bodies(methods: list[MethodSpec], class_name: str) -> None:
    """Infer method bodies for Lombok @With patterns.

    A method named `with_foo` that returns the same class and takes one param
    is a Lombok @With — creates an immutable copy with one field changed.
    Translates to: return dataclasses.replace(self, foo=value)
    """
    for m in methods:
        if not m.name.startswith("with_"):
            continue
        if m.return_type != class_name:
            continue
        if len(m.params) != 1:
            continue
        if m.kind != "instance":
            continue

        field_name = m.name[5:]  # strip "with_"
        param_name = m.params[0].name
        m.body_lines = [f"return replace(self, {field_name}={param_name})"]
        m.raises_not_implemented = False


def _resolve_overloads(methods: list[MethodSpec]) -> list[MethodSpec]:
    """Merge Java method overloads into single Python methods.

    Java allows multiple methods with the same name but different parameter counts.
    Python doesn't — later defs silently overwrite earlier ones.

    Strategy: for each name group, keep the version with the most parameters
    and make the extra params optional (default None). This preserves all
    call signatures through one method.
    """
    from collections import OrderedDict
    groups: OrderedDict[str, list[MethodSpec]] = OrderedDict()
    for m in methods:
        groups.setdefault(m.name, []).append(m)

    result = []
    for name, group in groups.items():
        if len(group) == 1:
            result.append(group[0])
            continue

        # Keep the method with the most parameters
        group.sort(key=lambda m: len(m.params), reverse=True)
        winner = group[0]

        # Find the minimum param count across all overloads
        min_params = min(len(m.params) for m in group)

        # Make params beyond min_params optional (default None)
        for i, p in enumerate(winner.params):
            if i >= min_params and p.default_expr is None:
                p.type_str = f"{p.type_str} | None"
                p.default_expr = "None"

        result.append(winner)

    return result


def _build_class(ti: TypeInfo) -> ClassSpec:
    """Convert a tree-sitter TypeInfo to a scaffold ClassSpec."""
    # Determine style
    if ti.kind == "enum":
        style = "enum"
    elif ti.kind == "interface":
        style = "protocol"
    else:
        style = "dataclass"

    # Modifiers
    is_abstract = "abstract" in ti.modifiers
    is_final = "final" in ti.modifiers
    has_abstract_methods = any(m.is_abstract for m in ti.methods)

    # Decorators
    decorators = []
    if style == "dataclass":
        decorators.append(DecoratorSpec(expr="@dataclass(slots=True, kw_only=True)"))

    # Bases
    bases = list(ti.extends)
    if ti.kind == "interface":
        # Always include Protocol for interfaces, even when extends exist
        bases.append("Protocol")
    else:
        bases.extend(ti.implements)
        # Add ABC for abstract classes
        if is_abstract or has_abstract_methods:
            bases.insert(0, "ABC")

    # Fields — separate static from instance
    fields = []
    for f in ti.fields:
        is_static = f.is_static and f.is_final
        fields.append(_build_field(f, is_static=is_static))

    # Methods — prune redundant get*/is* stubs that duplicate a field
    field_names = {f.name for f in ti.fields}
    field_names_snake = {_to_snake(f.name) for f in ti.fields}

    def _is_redundant_getter(mi: MethodInfo) -> bool:
        name = mi.name
        if name.startswith("get") and len(name) > 3:
            inferred = name[3].lower() + name[4:]
            return inferred in field_names or _to_snake(inferred) in field_names_snake
        if name.startswith("is") and len(name) > 2:
            inferred = name[2].lower() + name[3:]
            return inferred in field_names or _to_snake(inferred) in field_names_snake
        return False

    methods = [_build_method(m) for m in ti.methods if not _is_redundant_getter(m)]

    # Resolve Java method overloading — merge same-name methods into one
    methods = _resolve_overloads(methods)

    # Infer with* method bodies (Lombok @With → dataclasses.replace)
    _infer_with_bodies(methods, ti.name)

    # Inner classes
    inner = [_build_class(it) for it in ti.inner_types]
    for ic in inner:
        if ic.style == "dataclass":
            ic.decorators = [DecoratorSpec(expr="@dataclass(slots=True)")]

    # Source metadata
    source_meta: dict = {}
    if ti.kind == "record":
        source_meta["java_kind"] = "record"
    if ti.kind == "annotation":
        source_meta["java_kind"] = "annotation"
    if ti.annotations:
        source_meta["annotations"] = ti.annotations
    if ti.modifiers:
        source_meta["modifiers"] = ti.modifiers
    if ti.permits:
        source_meta["permits"] = ti.permits

    result = ClassSpec(
        name=ti.name,
        source_name=ti.name,
        kind=ti.kind,
        style=style,
        bases=bases,
        is_abstract=is_abstract,
        is_final=is_final,
        decorators=decorators,
        docstring=ti.schema_title,
        fields=fields,
        methods=methods,
        enum_members=ti.enum_constants,
        inner_classes=inner,
        source_meta=source_meta,
    )
    _apply_lombok(result)
    return result


def _apply_lombok(cls: ClassSpec) -> None:
    """Interpret Lombok annotations from source_meta and apply Python equivalents.

    Mutates cls in place. Handles:
    - @Value → frozen=True dataclass (immutable)
    - @Slf4j → ClassVar logger field + logging import signal
    - @Data → no change (already a dataclass)
    - @Builder / @SuperBuilder → no change (kw_only=True already set)
    - @Getter / @Setter → no change (dataclass fields are accessible)
    """
    annotations = set(cls.source_meta.get("annotations", []))
    if not annotations:
        return

    # @Value → frozen immutable dataclass
    if "Value" in annotations:
        cls.decorators = [
            DecoratorSpec(expr="@dataclass(frozen=True, slots=True, kw_only=True)")
            if "@dataclass" in d.expr else d
            for d in cls.decorators
        ]

    # @Slf4j → add logger as class-level field
    if "Slf4j" in annotations:
        logger_field = FieldSpec(
            name="logger",
            type_str="Logger",
            original_name="log",
            default_expr="getLogger(__name__)",
            is_class_var=True,
            is_init=False,
        )
        cls.fields.insert(0, logger_field)


def _apply_aliases(types: list[ClassSpec], alias_map: dict[str, str]):
    """Rewrite type references to use aliases where needed."""
    for cls in types:
        cls.bases = [alias_map.get(b, b) for b in cls.bases]
        for f in cls.fields:
            for orig, alias in alias_map.items():
                f.type_str = re.sub(r'\b' + re.escape(orig) + r'\b', alias, f.type_str)
        for m in cls.methods:
            for orig, alias in alias_map.items():
                m.return_type = re.sub(r'\b' + re.escape(orig) + r'\b', alias, m.return_type)
                for p in m.params:
                    p.type_str = re.sub(r'\b' + re.escape(orig) + r'\b', alias, p.type_str)
        _apply_aliases(cls.inner_classes, alias_map)


def _collect_structural_needs(types: list[ClassSpec]) -> dict[str, bool]:
    """Walk full type tree (including inner classes) for structural import needs."""
    needs = {"dataclass": False, "field": False, "replace": False,
             "enum": False, "protocol": False, "abc": False}
    for cls in types:
        if cls.style == "dataclass":
            needs["dataclass"] = True
        if cls.style == "enum":
            needs["enum"] = True
        if cls.style == "protocol":
            needs["protocol"] = True
        if cls.is_abstract or any(m.is_abstract for m in cls.methods):
            needs["abc"] = True
        for f in cls.fields:
            if f.default_factory is not None or not f.is_init:
                needs["field"] = True
        for m in cls.methods:
            if any("replace(self" in bl for bl in m.body_lines):
                needs["replace"] = True
        sub = _collect_structural_needs(cls.inner_classes)
        for k in needs:
            needs[k] = needs[k] or sub[k]
    return needs


# Types that need a `from typing import X` when they appear in type strings
_TYPING_TYPES = {"Optional", "Callable", "Iterator", "Iterable", "ClassVar"}


def _collect_typing_needs(types: list[ClassSpec]) -> set[str]:
    """Walk full type tree for typing module import needs."""
    needed: set[str] = set()

    def _scan_type_str(ts: str):
        for t in _TYPING_TYPES:
            if t in ts:
                needed.add(t)

    for cls in types:
        for f in cls.fields:
            if f.is_class_var:
                needed.add("ClassVar")
            _scan_type_str(f.type_str)
        for m in cls.methods:
            _scan_type_str(m.return_type)
            for p in m.params:
                _scan_type_str(p.type_str)
        needed |= _collect_typing_needs(cls.inner_classes)
    return needed


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

    # Remove package name fragments (leak from scoped type identifiers)
    referenced -= _PACKAGE_FRAGMENTS

    # Remove known external framework types (no Python equivalent)
    referenced -= _EXTERNAL_FRAMEWORK_TYPES

    # Remove single-letter generic type params
    referenced -= {n for n in referenced if len(n) == 1 and n.isupper()}

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

    # Resolve cross-file imports — track used names for alias detection
    used_names: set[str] = set(local_names)
    alias_map: dict[str, str] = {}
    for name in sorted(referenced):
        resolved, alias = registry.resolve_with_alias(name, file_info.imports, used_names)
        if resolved and resolved != module_path:
            imports.append(ImportSpec(
                module=resolved,
                name=name,
                kind="cross_file",
                alias=alias,
            ))
            used_names.add(alias or name)
            if alias:
                alias_map[name] = alias
        elif resolved is None and name not in JAVA_TO_PYTHON_TYPES:
            unresolved_types.append(name)

    # Rewrite type references to use aliases
    if alias_map:
        _apply_aliases(types, alias_map)

    # Collect all import needs from full type tree (including inner classes)
    structural = _collect_structural_needs(types)
    typing_needs = _collect_typing_needs(types)
    typing_needs.add("Any")  # Always needed
    if structural["protocol"]:
        typing_needs.add("Protocol")

    typing_imports: list[ImportSpec] = []

    # abc imports
    if structural["abc"]:
        typing_imports.append(ImportSpec(module="abc", name="ABC, abstractmethod", kind="stdlib"))

    # dataclass imports
    if structural["dataclass"]:
        parts = ["dataclass"]
        if structural["field"]:
            parts.append("field")
        if structural["replace"]:
            parts.append("replace")
        typing_imports.append(ImportSpec(module="dataclasses", name=", ".join(parts), kind="stdlib"))

    # enum imports
    if structural["enum"]:
        typing_imports.append(ImportSpec(module="enum", name="Enum", kind="stdlib"))

    # logging import (from @Slf4j Lombok annotation)
    needs_logging = any(
        any(f.name == "logger" and f.type_str == "Logger" for f in cls.fields)
        for cls in types
    )
    if needs_logging:
        typing_imports.append(ImportSpec(module="logging", name="Logger, getLogger", kind="stdlib"))

    # typing imports
    typing_names = sorted(typing_needs)
    typing_imports.append(ImportSpec(module="typing", name=", ".join(typing_names), kind="typing"))

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

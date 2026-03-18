"""
Extract structural information from Java source using tree-sitter-java.

Handles all Java versions including 17+ (records, sealed classes, text blocks,
pattern matching, switch expressions). Produces an IR (FileInfo) that the
scaffold generator consumes.

Usage:
    from integrations.javalang.pipeline.ts_extract import extract_file
    info = extract_file(java_source)
"""

from __future__ import annotations

from dataclasses import dataclass, field

import tree_sitter_java as tsjava
from tree_sitter import Language, Parser, Node

JAVA_LANGUAGE = Language(tsjava.language())


# --- IR dataclasses ---

@dataclass
class FieldInfo:
    name: str
    type_str: str
    is_required: bool = False
    has_default: bool = False
    default_value: str | None = None
    is_static: bool = False
    is_final: bool = False
    annotations: list[str] = field(default_factory=list)


@dataclass
class ParamInfo:
    name: str
    type_str: str


@dataclass
class MethodInfo:
    name: str
    return_type: str
    parameters: list[ParamInfo] = field(default_factory=list)
    is_static: bool = False
    is_abstract: bool = False
    annotations: list[str] = field(default_factory=list)


@dataclass
class TypeInfo:
    kind: str  # "class", "interface", "enum", "record"
    name: str
    extends: list[str] = field(default_factory=list)
    implements: list[str] = field(default_factory=list)
    fields: list[FieldInfo] = field(default_factory=list)
    methods: list[MethodInfo] = field(default_factory=list)
    inner_types: list[TypeInfo] = field(default_factory=list)
    enum_constants: list[str] = field(default_factory=list)
    schema_title: str | None = None
    modifiers: list[str] = field(default_factory=list)
    annotations: list[str] = field(default_factory=list)
    permits: list[str] = field(default_factory=list)


@dataclass
class FileInfo:
    package: str = ""
    imports: list[str] = field(default_factory=list)
    types: list[TypeInfo] = field(default_factory=list)
    referenced_types: set[str] = field(default_factory=set)


# --- Parser singleton ---

_parser = None

def _get_parser() -> Parser:
    global _parser
    if _parser is None:
        _parser = Parser(JAVA_LANGUAGE)
    return _parser


# --- Helper: find children by type ---

def _children_of_type(node: Node, *type_names: str) -> list[Node]:
    return [c for c in node.children if c.type in type_names]


def _first_child_of_type(node: Node, *type_names: str) -> Node | None:
    for c in node.children:
        if c.type in type_names:
            return c
    return None


def _node_text(node: Node | None) -> str:
    if node is None:
        return ""
    return node.text.decode("utf-8", errors="replace")


# --- Type name extraction ---

def _type_name(node: Node) -> str:
    """Extract a clean type name from a type node."""
    if node is None:
        return "Any"
    if node.type == "type_identifier":
        return _node_text(node)
    if node.type == "generic_type":
        base = _first_child_of_type(node, "type_identifier", "scoped_type_identifier")
        args = _first_child_of_type(node, "type_arguments")
        base_name = _type_name(base) if base else "?"
        if args:
            arg_types = [_type_name(c) for c in args.children
                         if c.type not in (",", "<", ">", "type_arguments")]
            return f"{base_name}[{', '.join(arg_types)}]" if arg_types else base_name
        return base_name
    if node.type == "scoped_type_identifier":
        return _node_text(node).replace(".", ".")
    if node.type == "array_type":
        element = node.child_by_field_name("element")
        return f"list[{_type_name(element)}]" if element else "list"
    if node.type in ("void_type",):
        return "None"
    if node.type in ("integral_type", "floating_point_type", "boolean_type"):
        return _node_text(node)
    if node.type == "wildcard":
        return "Any"
    # Fallback: use raw text
    return _node_text(node)


def _simple_type_name(node: Node) -> str:
    """Extract just the base type name (no generics) for registry/import lookup."""
    if node is None:
        return ""
    if node.type == "type_identifier":
        return _node_text(node)
    if node.type == "generic_type":
        base = _first_child_of_type(node, "type_identifier", "scoped_type_identifier")
        return _simple_type_name(base) if base else ""
    if node.type == "scoped_type_identifier":
        # Return the last part: Map.Entry -> Entry
        parts = _node_text(node).split(".")
        return parts[-1]
    return ""


# --- Annotation helpers ---

def _has_annotation(node: Node, name: str) -> bool:
    """Check if a node has a specific annotation."""
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return False
    for ann in _children_of_type(mods, "annotation", "marker_annotation"):
        ann_name = _first_child_of_type(ann, "identifier")
        if ann_name and _node_text(ann_name) == name:
            return True
    return False


def _get_schema_title(node: Node) -> str | None:
    """Extract @Schema(title = "...") value."""
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return None
    for ann in _children_of_type(mods, "annotation"):
        ann_name = _first_child_of_type(ann, "identifier")
        if ann_name and _node_text(ann_name) == "Schema":
            args = _first_child_of_type(ann, "annotation_argument_list")
            if args:
                for pair in _children_of_type(args, "element_value_pair"):
                    key = pair.child_by_field_name("key")
                    value = pair.child_by_field_name("value")
                    if key and _node_text(key) == "title" and value:
                        text = _node_text(value).strip('"')
                        return text
    return None


def _has_modifier(node: Node, modifier: str) -> bool:
    """Check if a node has a specific modifier (public, static, etc.)."""
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return False
    for c in mods.children:
        if _node_text(c) == modifier:
            return True
    return False


def _collect_annotations(node: Node) -> list[str]:
    """Collect annotation names from a node's modifiers.

    Handles both simple (@NotNull) and fully-qualified (@jakarta.validation.NotNull)
    annotations. For scoped annotations, captures the last identifier (e.g., "NotNull").
    """
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return []
    names = []
    for ann in _children_of_type(mods, "annotation", "marker_annotation"):
        # Try simple identifier first
        ann_name = _first_child_of_type(ann, "identifier")
        if ann_name:
            names.append(_node_text(ann_name))
            continue
        # Try scoped identifier (e.g., jakarta.validation.NotNull)
        scoped = _first_child_of_type(ann, "scoped_identifier")
        if scoped:
            # Use the last identifier in the chain
            text = _node_text(scoped)
            names.append(text.rsplit(".", 1)[-1])
    return names


def _collect_modifiers(node: Node) -> list[str]:
    """Collect modifier keywords (public, static, abstract, sealed, etc.)."""
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return []
    keywords = []
    for c in mods.children:
        if c.type not in ("annotation", "marker_annotation") and _node_text(c).isalpha():
            keywords.append(_node_text(c))
    return keywords


# --- Field extraction ---

def _extract_field(node: Node) -> list[FieldInfo]:
    """Extract field info from a field_declaration node."""
    fields = []
    type_node = node.child_by_field_name("type")
    type_str = _type_name(type_node) if type_node else "Any"

    is_required = _has_annotation(node, "NotNull") or _has_annotation(node, "NotBlank")
    has_default = _has_annotation(node, "Builder.Default")
    is_static = _has_modifier(node, "static")
    is_final = _has_modifier(node, "final")
    annotations = _collect_annotations(node)

    for decl in _children_of_type(node, "variable_declarator"):
        name_node = decl.child_by_field_name("name")
        value_node = decl.child_by_field_name("value")
        if name_node:
            default_value = None
            if value_node:
                raw = _node_text(value_node)
                if raw == "true":
                    default_value = "True"
                elif raw == "false":
                    default_value = "False"
                elif raw == "null":
                    default_value = "None"
                else:
                    default_value = raw

            fields.append(FieldInfo(
                name=_node_text(name_node),
                type_str=type_str,
                is_required=is_required,
                has_default=has_default or value_node is not None,
                default_value=default_value if (has_default or value_node) else None,
                is_static=is_static,
                is_final=is_final,
                annotations=annotations,
            ))
    return fields


# --- Method extraction ---

def _extract_params(node: Node) -> list[ParamInfo]:
    """Extract parameter list from formal_parameters node."""
    params = []
    if node is None:
        return params
    for param in _children_of_type(node, "formal_parameter", "spread_parameter"):
        type_node = param.child_by_field_name("type")
        name_node = param.child_by_field_name("name")
        if type_node and name_node:
            params.append(ParamInfo(
                name=_node_text(name_node),
                type_str=_type_name(type_node),
            ))
    return params


def _extract_method(node: Node) -> MethodInfo | None:
    """Extract method info from a method_declaration node."""
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    name = _node_text(name_node)

    # Skip setters
    if name.startswith("set") and len(name) > 3:
        return None

    type_node = node.child_by_field_name("type")
    return_type = _type_name(type_node) if type_node else "None"

    params_node = node.child_by_field_name("parameters")
    parameters = _extract_params(params_node)

    is_static = _has_modifier(node, "static")
    is_abstract = _has_modifier(node, "abstract")
    annotations = _collect_annotations(node)

    return MethodInfo(
        name=name,
        return_type=return_type,
        parameters=parameters,
        is_static=is_static,
        is_abstract=is_abstract,
        annotations=annotations,
    )


# --- Type declaration extraction ---

def _extract_body(body_node: Node, type_info: TypeInfo):
    """Extract fields, methods, and inner types from a class/interface/enum body."""
    if body_node is None:
        return

    for child in body_node.children:
        if child.type == "field_declaration":
            type_info.fields.extend(_extract_field(child))
        elif child.type == "method_declaration":
            method = _extract_method(child)
            if method:
                type_info.methods.append(method)
        elif child.type == "constructor_declaration":
            # Skip constructors — not needed for scaffolds
            pass
        elif child.type in ("class_declaration", "interface_declaration",
                            "enum_declaration", "record_declaration"):
            inner = _extract_type(child)
            if inner:
                type_info.inner_types.append(inner)
        elif child.type == "enum_constant":
            name_node = child.child_by_field_name("name")
            if name_node:
                type_info.enum_constants.append(_node_text(name_node))


def _extract_type(node: Node) -> TypeInfo | None:
    """Extract type info from a type declaration node."""
    kind_map = {
        "class_declaration": "class",
        "interface_declaration": "interface",
        "enum_declaration": "enum",
        "record_declaration": "record",
    }
    kind = kind_map.get(node.type)
    if not kind:
        return None

    name_node = node.child_by_field_name("name")
    name = _node_text(name_node) if name_node else "?"

    info = TypeInfo(kind=kind, name=name)

    # Extends
    superclass = node.child_by_field_name("superclass")
    if superclass:
        for c in superclass.children:
            if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                info.extends.append(_simple_type_name(c) or _type_name(c))

    # Implements
    interfaces = node.child_by_field_name("interfaces")
    if interfaces:
        for c in interfaces.children:
            if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                info.implements.append(_simple_type_name(c) or _type_name(c))

    # For interfaces, extends is in an 'extends_interfaces' child node
    extends_if = _first_child_of_type(node, "extends_interfaces")
    if extends_if is not None:
        # extends_interfaces contains: extends keyword + type_list
        type_list = _first_child_of_type(extends_if, "type_list")
        if type_list:
            for c in type_list.children:
                if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                    info.extends.append(_simple_type_name(c) or _type_name(c))
        else:
            # Single type without type_list wrapper
            for c in extends_if.children:
                if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                    info.extends.append(_simple_type_name(c) or _type_name(c))
    elif kind == "interface":
        # Fallback: manually scan children for extends keyword
        saw_extends = False
        for c in node.children:
            if _node_text(c) == "extends":
                saw_extends = True
                continue
            if saw_extends and c.type == "type_list":
                for tc in c.children:
                    if tc.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                        info.extends.append(_simple_type_name(tc) or _type_name(tc))
                break
            if saw_extends and c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                info.extends.append(_simple_type_name(c) or _type_name(c))
                break

    # Modifiers and annotations
    info.modifiers = _collect_modifiers(node)
    info.annotations = _collect_annotations(node)

    # Permits clause (sealed classes)
    permits_node = _first_child_of_type(node, "permits")
    if permits_node is not None:
        type_list = _first_child_of_type(permits_node, "type_list")
        if type_list:
            for c in type_list.children:
                if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                    info.permits.append(_simple_type_name(c) or _type_name(c))
        else:
            for c in permits_node.children:
                if c.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                    info.permits.append(_simple_type_name(c) or _type_name(c))

    # Record parameters → fields
    if kind == "record":
        params_node = node.child_by_field_name("parameters")
        if params_node:
            for param in _children_of_type(params_node, "formal_parameter"):
                type_n = param.child_by_field_name("type")
                name_n = param.child_by_field_name("name")
                if type_n and name_n:
                    info.fields.append(FieldInfo(
                        name=_node_text(name_n),
                        type_str=_type_name(type_n),
                    ))

    # Schema title
    info.schema_title = _get_schema_title(node)

    # Body
    body = node.child_by_field_name("body")
    if body:
        _extract_body(body, info)

    return info


# --- Collect type references ---

def _collect_type_refs_from_node(node: Node, refs: set[str]):
    """Recursively collect type identifier names from a node."""
    if node.type == "type_identifier":
        refs.add(_node_text(node))
    for child in node.children:
        # Skip import/package declarations and method bodies
        if child.type in ("import_declaration", "package_declaration", "block",
                          "constructor_body", "string_literal", "comment",
                          "line_comment", "block_comment"):
            continue
        _collect_type_refs_from_node(child, refs)


# --- Main extraction ---

def extract_file(source: str) -> FileInfo:
    """Parse Java source with tree-sitter and extract structural information."""
    parser = _get_parser()
    tree = parser.parse(bytes(source, "utf-8"))
    root = tree.root_node

    info = FileInfo()

    # Package
    for child in root.children:
        if child.type == "package_declaration":
            scope = _first_child_of_type(child, "scoped_identifier")
            if scope:
                info.package = _node_text(scope)
            break

    # Imports
    for child in root.children:
        if child.type == "import_declaration":
            text = _node_text(child)
            path = text.replace("import ", "").replace("static ", "").rstrip(";").strip()
            info.imports.append(path)

    # Top-level type declarations
    for child in root.children:
        if child.type in ("class_declaration", "interface_declaration",
                          "enum_declaration", "record_declaration"):
            type_info = _extract_type(child)
            if type_info:
                info.types.append(type_info)

    # Collect type references
    refs: set[str] = set()
    _collect_type_refs_from_node(root, refs)
    info.referenced_types = refs

    return info

"""
Scaffold model — the Python-emission-ready IR.

These dataclasses represent what to emit, not what was parsed.
Every decision (naming, types, defaults, import paths) is already made
by the time these reach the emitter.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DecoratorSpec:
    """A decorator to emit above a class, method, or field."""
    expr: str


@dataclass
class ParamSpec:
    """A method/function parameter."""
    name: str
    type_str: str
    original_name: str | None = None
    default_expr: str | None = None
    is_varargs: bool = False
    is_kwargs: bool = False


@dataclass
class FieldSpec:
    """A class field / attribute."""
    name: str
    type_str: str
    original_name: str
    default_expr: str | None = None
    default_factory: str | None = None
    is_optional: bool = False
    is_class_var: bool = False
    is_init: bool = True
    decorators: list[DecoratorSpec] = field(default_factory=list)


@dataclass
class MethodSpec:
    """A method or function."""
    name: str
    original_name: str
    return_type: str
    params: list[ParamSpec] = field(default_factory=list)
    kind: str = "instance"  # instance | static | classmethod | property | constructor
    is_abstract: bool = False
    raises_not_implemented: bool = True
    decorators: list[DecoratorSpec] = field(default_factory=list)
    docstring: str | None = None
    body_lines: list[str] = field(default_factory=list)


@dataclass
class ClassSpec:
    """A class, interface, enum, or record to emit."""
    name: str
    source_name: str
    kind: str = "class"          # class | interface | enum | record | annotation
    style: str = "dataclass"     # dataclass | protocol | enum
    bases: list[str] = field(default_factory=list)
    type_params: list[str] = field(default_factory=list)
    is_abstract: bool = False
    is_final: bool = False
    decorators: list[DecoratorSpec] = field(default_factory=list)
    docstring: str | None = None
    fields: list[FieldSpec] = field(default_factory=list)
    methods: list[MethodSpec] = field(default_factory=list)
    enum_members: list[str] = field(default_factory=list)
    inner_classes: list[ClassSpec] = field(default_factory=list)
    source_meta: dict = field(default_factory=dict)


@dataclass
class ImportSpec:
    """A single import statement."""
    module: str
    name: str
    kind: str = "cross_file"  # stdlib | typing | cross_file
    alias: str | None = None


@dataclass
class ModuleSpec:
    """A complete Python module to emit."""
    file_path: Path
    module_path: str
    source_file: str
    future_imports: list[str] = field(default_factory=lambda: ["annotations"])
    module_docstring: str | None = None
    imports: list[ImportSpec] = field(default_factory=list)
    types: list[ClassSpec] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

"""
Parse Java source from E:/KESTRA and emit Python scaffolds
into writing-system/engine/, merging by Java package.

Mapping:
  E:/KESTRA/{module}/src/main/java/io/kestra/{pkg}/{rest}.java
  → engine/{pkg}/{rest_snake}.py

Two-pass:
  1. Scan all modules → class registry (ClassName → importable module path)
  2. Parse → generate Python with resolved cross-file imports
"""

import re
import os
import shutil
import sys
from pathlib import Path

import javalang

# --- Configuration ---

def require_env_path(name: str) -> Path:
    raw = os.environ.get(name)
    if not raw:
        print(f"ERROR: Set {name} to your Kestra checkout root before running this script.")
        sys.exit(1)
    return Path(raw)


KESTRA_ROOT = require_env_path("KESTRA_ROOT")
OUTPUT_ROOT = Path(__file__).resolve().parent.parent / "engine"
PACKAGE_PREFIX = "engine"

# --- Type mapping ---

JAVA_TO_PYTHON_TYPES = {
    "String": "str", "Integer": "int", "int": "int",
    "Long": "int", "long": "int", "Double": "float", "double": "float",
    "Float": "float", "float": "float", "Boolean": "bool", "boolean": "bool",
    "void": "None", "Object": "Any", "List": "list", "Map": "dict",
    "Set": "set", "URI": "str", "Duration": "timedelta",
    "Instant": "datetime", "ZonedDateTime": "datetime",
    "LocalDate": "date", "LocalTime": "time",
    "Path": "Path", "File": "Path", "byte[]": "bytes",
}

STDLIB_TYPE_IMPORTS = {
    "Duration": "from datetime import timedelta",
    "Instant": "from datetime import datetime",
    "ZonedDateTime": "from datetime import datetime",
    "LocalDate": "from datetime import date",
    "LocalTime": "from datetime import time",
    "Path": "from pathlib import Path",
    "File": "from pathlib import Path",
}

CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")


def to_snake(name: str) -> str:
    return CAMEL_RE.sub("_", name).lower()


def map_type(java_type: str) -> str:
    base = java_type.split("[")[0] if "[" in java_type else java_type
    mapped = JAVA_TO_PYTHON_TYPES.get(base, base)
    if "[" in java_type:
        inner = java_type[java_type.index("["):]
        return mapped + inner
    return mapped


def extract_type_info(type_node) -> str:
    if type_node is None:
        return "Any"
    if hasattr(type_node, "name"):
        name = type_node.name
    elif hasattr(type_node, "type") and type_node.type is not None:
        return extract_type_info(type_node.type)
    else:
        return "Any"
    if hasattr(type_node, "arguments") and type_node.arguments:
        args = ", ".join(
            extract_type_info(a) for a in type_node.arguments if a is not None
        )
        return f"{name}[{args}]" if args else name
    return name


def map_full_type(type_node) -> str:
    java_type = extract_type_info(type_node)
    if java_type.startswith("Property["):
        inner = java_type[9:-1]
        return f"Property[{map_type(inner)}]"
    return map_type(java_type)


def extract_value_str(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        return repr(val)
    if isinstance(val, javalang.tree.Literal):
        v = val.value
        if v == "true": return "True"
        if v == "false": return "False"
        if v == "null": return "None"
        return v
    if isinstance(val, javalang.tree.MemberReference):
        q = val.qualifier or ""
        ref = f"{q}.{val.member}" if q else val.member
        return ref
    if hasattr(val, "value"):
        return repr(val.value)
    return None


def has_annotation(annotations, name: str) -> bool:
    if not annotations:
        return False
    return any(a.name == name for a in annotations)


def get_schema_title(annotations) -> str | None:
    if not annotations:
        return None
    for a in annotations:
        if a.name == "Schema" and a.element:
            if isinstance(a.element, list):
                for elem in a.element:
                    if hasattr(elem, "name") and elem.name == "title":
                        if hasattr(elem.value, "value"):
                            return elem.value.value.strip('"')
    return None


# --- Type reference collection ---

def collect_type_names(type_node, names: set):
    """Recursively collect raw Java type names from a type AST node."""
    if type_node is None:
        return
    if hasattr(type_node, "name"):
        names.add(type_node.name)
    if hasattr(type_node, "arguments") and type_node.arguments:
        for arg in type_node.arguments:
            if arg is not None:
                collect_type_names(arg, names)
    if hasattr(type_node, "type") and type_node.type is not None:
        collect_type_names(type_node.type, names)


def collect_all_refs(tree) -> set[str]:
    """Collect all type names referenced in the AST."""
    refs = set()
    for _, node in tree.filter(javalang.tree.ClassDeclaration):
        if node.extends:
            collect_type_names(node.extends, refs)
        if node.implements:
            for i in node.implements:
                collect_type_names(i, refs)
    for _, node in tree.filter(javalang.tree.InterfaceDeclaration):
        if node.extends:
            for e in node.extends:
                collect_type_names(e, refs)
    for _, node in tree.filter(javalang.tree.FieldDeclaration):
        collect_type_names(node.type, refs)
    for _, node in tree.filter(javalang.tree.MethodDeclaration):
        if node.return_type:
            collect_type_names(node.return_type, refs)
        if node.parameters:
            for p in node.parameters:
                collect_type_names(p.type, refs)
    return refs


def collect_local_names(tree) -> set[str]:
    """Collect class/interface/enum names defined in this file."""
    names = set()
    for _, node in tree.filter(javalang.tree.ClassDeclaration):
        names.add(node.name)
    for _, node in tree.filter(javalang.tree.InterfaceDeclaration):
        names.add(node.name)
    for _, node in tree.filter(javalang.tree.EnumDeclaration):
        names.add(node.name)
    return names


# --- Code generation ---

def generate_class(node, is_inner=False) -> list[str]:
    lines = []
    indent = "    " if is_inner else ""

    bases = []
    if node.extends:
        bases.append(node.extends.name)
    if node.implements:
        bases.extend(i.name for i in node.implements)
    bases_str = f"({', '.join(bases)})" if bases else ""

    if not is_inner:
        lines.append("@dataclass(slots=True, kw_only=True)")
    else:
        lines.append(f"{indent}@dataclass(slots=True)")
    lines.append(f"{indent}class {node.name}{bases_str}:")

    schema_title = get_schema_title(node.annotations)
    if schema_title:
        lines.append(f'{indent}    """{schema_title}"""')

    has_content = False

    for field_decl in node.fields:
        for decl in field_decl.declarators:
            fname = to_snake(decl.name)
            ftype = map_full_type(field_decl.type)
            required = has_annotation(field_decl.annotations, "NotNull")
            has_default = has_annotation(field_decl.annotations, "Builder.Default")
            init_val = extract_value_str(decl.initializer) if decl.initializer else None

            if has_default and init_val:
                lines.append(f"{indent}    {fname}: {ftype} = {init_val}")
            elif not required:
                lines.append(f"{indent}    {fname}: {ftype} | None = None")
            else:
                lines.append(f"{indent}    {fname}: {ftype}")
            has_content = True

    for method in node.methods:
        if method.name.startswith("set") and len(method.name) > 3:
            continue

        lines.append("")
        mname = to_snake(method.name)
        ret = map_full_type(method.return_type) if method.return_type else "None"

        params = ["self"]
        if method.parameters:
            for p in method.parameters:
                pname = to_snake(p.name)
                ptype = map_full_type(p.type)
                params.append(f"{pname}: {ptype}")

        params_str = ", ".join(params)
        lines.append(f"{indent}    def {mname}({params_str}) -> {ret}:")
        lines.append(f"{indent}        raise NotImplementedError  # TODO: translate from Java")
        has_content = True

    if not has_content:
        lines.append(f"{indent}    pass")

    return lines


def generate_interface(node) -> list[str]:
    lines = []
    bases = []
    if node.extends:
        bases.extend(e.name for e in node.extends)
    bases_str = f"({', '.join(bases)})" if bases else "(Protocol)"

    lines.append(f"class {node.name}{bases_str}:")

    schema_title = get_schema_title(node.annotations)
    if schema_title:
        lines.append(f'    """{schema_title}"""')

    has_content = False
    for method in node.methods:
        mname = to_snake(method.name)
        ret = map_full_type(method.return_type) if method.return_type else "None"
        params = ["self"]
        if method.parameters:
            for p in method.parameters:
                pname = to_snake(p.name)
                ptype = map_full_type(p.type)
                params.append(f"{pname}: {ptype}")
        params_str = ", ".join(params)
        lines.append(f"    def {mname}({params_str}) -> {ret}: ...")
        has_content = True

    if not has_content:
        lines.append("    pass")

    return lines


def generate_enum(node) -> list[str]:
    lines = []
    lines.append(f"class {node.name}(str, Enum):")
    if node.body and node.body.constants:
        for const in node.body.constants:
            lines.append(f'    {const.name} = "{const.name}"')
    else:
        lines.append("    pass")
    return lines


# --- Main orchestration ---

def discover_java_files():
    """Find all Java source files across all Kestra modules."""
    files = []
    for module_dir in sorted(KESTRA_ROOT.iterdir()):
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


def build_registry(files):
    """Build ClassName → importable Python module path."""
    registry = {}
    conflicts = []
    for java_file, rel, module in files:
        class_name = java_file.stem
        py_module = to_snake(class_name)
        parts = [PACKAGE_PREFIX] + list(rel.parent.parts) + [py_module]
        module_path = ".".join(parts)

        if class_name in registry and registry[class_name] != module_path:
            conflicts.append((class_name, registry[class_name], module_path, module))
        registry[class_name] = module_path
    return registry, conflicts


def check_collisions(files):
    """Check for output path collisions."""
    targets = {}
    collisions = []
    for java_file, rel, module in files:
        py_name = to_snake(rel.stem) + ".py"
        target = str(rel.parent / py_name)
        if target in targets:
            _, prev_module = targets[target]
            collisions.append((target, prev_module, module))
        else:
            targets[target] = (java_file, module)
    return collisions


def generate_file(java_file, rel, registry):
    """Parse a Java file and generate Python with resolved imports."""
    try:
        source = java_file.read_text(encoding="utf-8", errors="replace")
        tree = javalang.parse.parse(source)
    except Exception as e:
        return None, str(e)

    # Collect type info
    local_names = collect_local_names(tree)
    all_refs = collect_all_refs(tree)

    # Own module path (to avoid self-imports)
    py_module = to_snake(java_file.stem)
    own_parts = [PACKAGE_PREFIX] + list(rel.parent.parts) + [py_module]
    own_module = ".".join(own_parts)

    # Classify AST nodes
    classes = []
    interfaces = []
    enums = []
    needs_dataclass = False
    needs_enum = False
    needs_protocol = False

    for _, node in tree.filter(javalang.tree.ClassDeclaration):
        classes.append(node)
        needs_dataclass = True
    for _, node in tree.filter(javalang.tree.InterfaceDeclaration):
        interfaces.append(node)
        needs_protocol = True
    for _, node in tree.filter(javalang.tree.EnumDeclaration):
        enums.append(node)
        needs_enum = True

    # Generate body
    body = []
    for node in enums:
        body.extend(generate_enum(node))
        body.extend(["", ""])
    for node in interfaces:
        body.extend(generate_interface(node))
        body.extend(["", ""])
    for node in classes:
        body.extend(generate_class(node))
        if node.body:
            for member in node.body:
                if isinstance(member, javalang.tree.ClassDeclaration):
                    body.append("")
                    body.extend(generate_class(member, is_inner=True))
        body.extend(["", ""])

    while body and body[-1] == "":
        body.pop()

    # Build import section
    imports = ["from __future__ import annotations", ""]

    # Standard library
    if needs_dataclass:
        imports.append("from dataclasses import dataclass, field")
    if needs_enum:
        imports.append("from enum import Enum")
    if needs_protocol:
        imports.append("from typing import Any, Protocol")
    else:
        imports.append("from typing import Any")

    # Stdlib type imports (datetime, Path, etc.)
    stdlib_lines = set()
    for ref in all_refs:
        if ref in STDLIB_TYPE_IMPORTS:
            stdlib_lines.add(STDLIB_TYPE_IMPORTS[ref])
    if stdlib_lines:
        imports.extend(sorted(stdlib_lines))

    # Cross-file imports: only for types in the registry, skip mapped builtins
    cross = []
    for name in sorted(all_refs - local_names):
        if name in JAVA_TO_PYTHON_TYPES:
            continue
        if name in registry:
            mod_path = registry[name]
            if mod_path != own_module:
                cross.append(f"from {mod_path} import {name}")
    if cross:
        imports.append("")
        imports.extend(cross)

    imports.extend(["", ""])

    result = "\n".join(imports + body) + "\n"
    return result, None


def main():
    if not KESTRA_ROOT.exists():
        print(f"ERROR: {KESTRA_ROOT} does not exist")
        exit(1)

    print(f"Kestra root: {KESTRA_ROOT}")
    print(f"Output root: {OUTPUT_ROOT}")
    print()

    # Phase 1: Discover
    files = discover_java_files()
    modules = sorted(set(m for _, _, m in files))
    print(f"Found {len(files)} Java files across {len(modules)} modules")
    for m in modules:
        count = sum(1 for _, _, mod in files if mod == m)
        print(f"  {m}: {count}")
    print()

    # Check collisions
    collisions = check_collisions(files)
    if collisions:
        print(f"WARNING: {len(collisions)} output path collisions (last module wins):")
        for target, mod1, mod2 in collisions[:15]:
            print(f"  {target}: {mod1} vs {mod2}")
        if len(collisions) > 15:
            print(f"  ... and {len(collisions) - 15} more")
        print()

    # Build registry
    registry, conflicts = build_registry(files)
    if conflicts:
        print(f"WARNING: {len(conflicts)} class name conflicts (last wins):")
        for name, path1, path2, mod in conflicts[:15]:
            print(f"  {name}: {path1} vs {path2} (from {mod})")
        if len(conflicts) > 15:
            print(f"  ... and {len(conflicts) - 15} more")
        print()

    print(f"Registry: {len(registry)} classes")
    print()

    # Clean previous output
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)

    # Phase 2: Generate
    success = 0
    errors = 0
    error_files = []

    for java_file, rel, module in files:
        py_name = to_snake(rel.stem) + ".py"
        out_path = OUTPUT_ROOT / rel.parent / py_name
        out_path.parent.mkdir(parents=True, exist_ok=True)

        init = out_path.parent / "__init__.py"
        if not init.exists():
            init.write_text("")

        python_source, error = generate_file(java_file, rel, registry)
        if python_source:
            out_path.write_text(python_source, encoding="utf-8")
            success += 1
        else:
            out_path.write_text(
                f"# PARSE ERROR: {error}\n"
                f"# Source: {java_file.name}\n"
                f"# Module: {module}\n"
                f"# Needs manual translation\n",
                encoding="utf-8",
            )
            errors += 1
            error_files.append((str(rel), module, error))

    # Ensure __init__.py everywhere
    for dirpath, _, _ in os.walk(OUTPUT_ROOT):
        init = Path(dirpath) / "__init__.py"
        if not init.exists():
            init.write_text("")

    print(f"Results:")
    print(f"  Total:   {success + errors}")
    print(f"  Success: {success}")
    print(f"  Errors:  {errors}")

    if error_files:
        print(f"\nFailed files:")
        for f, m, e in error_files[:20]:
            print(f"  [{m}] {f}: {e}")
        if len(error_files) > 20:
            print(f"  ... and {len(error_files) - 20} more")


if __name__ == "__main__":
    main()

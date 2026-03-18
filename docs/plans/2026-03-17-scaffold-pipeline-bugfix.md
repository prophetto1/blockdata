# Scaffold Pipeline Bugfix Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix five confirmed bugs in the scaffold pipeline (interface extends, static fields, abstract methods, missing imports, alias resolution) and add regression tests.

**Architecture:** All fixes flow one direction through the pipeline: ts_extract.py (extraction) → scaffold_builder.py (decisions) → python_emitter.py (formatting). Bugs 1-2 are in the extractor, 3-4 in the builder, 5 spans registry+builder. Each task includes a regression test that fails before the fix and passes after.

**Tech Stack:** tree-sitter-java, Python dataclasses, pytest. All code lives in `integrations/javalang/pipeline/`.

---

## Scope Lock

This plan fixes only the confirmed bugs from the gap analysis. It does not add:
- Lombok interpretation
- Method body translation
- Getter/setter filtering optimization
- Nested generic annotation stripping in preprocess.py
- `var` context-awareness in preprocess.py

## File Layout

All changes are in:
- `integrations/javalang/pipeline/ts_extract.py`
- `integrations/javalang/pipeline/scaffold_builder.py`
- `integrations/javalang/pipeline/python_emitter.py`
- `integrations/javalang/pipeline/symbol_registry.py`
- `tests/test_scaffold_pipeline.py` (new)

---

### Task 1: Fix interface extends extraction

**Files:**
- Modify: `integrations/javalang/pipeline/ts_extract.py:333-348`
- Create: `tests/test_scaffold_pipeline.py`

**Step 1: Write the failing tests**

```python
# tests/test_scaffold_pipeline.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from integrations.javalang.pipeline.ts_extract import extract_file


def test_interface_single_extends():
    info = extract_file("public interface Child extends Parent { void run(); }")
    assert len(info.types) == 1
    assert info.types[0].kind == "interface"
    assert info.types[0].extends == ["Parent"]


def test_interface_multi_extends():
    info = extract_file("public interface Child extends A, B { void run(); }")
    assert len(info.types) == 1
    assert set(info.types[0].extends) == {"A", "B"}


def test_interface_generic_extends():
    info = extract_file("public interface Child extends Comparable<String> { void run(); }")
    assert len(info.types) == 1
    assert info.types[0].extends == ["Comparable"]
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: FAIL — extends=[] for all three

**Step 3: Fix the extraction**

Replace lines 333-348 in `integrations/javalang/pipeline/ts_extract.py` with:

```python
    # For interfaces, extends is in 'extends_interfaces' or found by scanning
    extends_if = node.child_by_field_name("extends_interfaces")
    if extends_if is not None:
        # tree-sitter provided the field — use it directly
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
```

Key changes:
- Process `extends_if` when it IS present (was only checked for None)
- Fix `tc` → `c` on the bare-type fallback path
- Guard fallback with `elif kind == "interface"` so class extends aren't duplicated

**Step 4: Run tests to verify they pass**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: 3 passed

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/ts_extract.py tests/test_scaffold_pipeline.py
git commit -m "fix: interface extends extraction — process extends_interfaces, fix tc variable"
```

---

### Task 2: Add modifier and annotation extraction to ts_extract.py

**Files:**
- Modify: `integrations/javalang/pipeline/ts_extract.py` (FieldInfo, MethodInfo, TypeInfo dataclasses + extraction functions)
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write the failing tests**

Add to `tests/test_scaffold_pipeline.py`:

```python
def test_static_final_field():
    info = extract_file("public class Foo { public static final String NAME = \"x\"; }")
    assert len(info.types[0].fields) == 1
    f = info.types[0].fields[0]
    assert f.name == "NAME"
    assert f.is_static is True
    assert f.is_final is True


def test_instance_field_not_static():
    info = extract_file("public class Foo { private String name; }")
    f = info.types[0].fields[0]
    assert f.is_static is False
    assert f.is_final is False


def test_abstract_method():
    info = extract_file("public abstract class Foo { public abstract void run(); }")
    m = info.types[0].methods[0]
    assert m.is_abstract is True


def test_concrete_method_not_abstract():
    info = extract_file("public class Foo { public void run() { return; } }")
    m = info.types[0].methods[0]
    assert m.is_abstract is False


def test_type_annotations_extracted():
    info = extract_file("@Deprecated public class Foo { }")
    assert "Deprecated" in info.types[0].annotations


def test_field_annotations_extracted():
    info = extract_file("public class Foo { @NotNull private String name; }")
    assert "NotNull" in info.types[0].fields[0].annotations


def test_sealed_permits_extracted():
    info = extract_file("public sealed class Shape permits Circle, Square { }")
    assert "sealed" in info.types[0].modifiers
    assert set(info.types[0].permits) == {"Circle", "Square"}
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "static or abstract or annotations or sealed" -v`
Expected: FAIL — FieldInfo/MethodInfo/TypeInfo have no is_static/is_final/is_abstract/annotations/modifiers/permits attributes

**Step 3: Update IR dataclasses**

In `ts_extract.py`, update the dataclasses:

```python
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
class MethodInfo:
    name: str
    return_type: str
    parameters: list[ParamInfo] = field(default_factory=list)
    is_static: bool = False
    is_abstract: bool = False
    annotations: list[str] = field(default_factory=list)


@dataclass
class TypeInfo:
    kind: str
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
```

**Step 4: Add annotation/modifier collection helpers**

Add to `ts_extract.py`:

```python
def _collect_annotations(node: Node) -> list[str]:
    """Collect annotation names from a node's modifiers."""
    mods = _first_child_of_type(node, "modifiers")
    if not mods:
        return []
    names = []
    for ann in _children_of_type(mods, "annotation", "marker_annotation"):
        ann_name = _first_child_of_type(ann, "identifier")
        if ann_name:
            names.append(_node_text(ann_name))
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
```

**Step 5: Update `_extract_field`**

Replace `_extract_field()` with:

```python
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
```

**Step 6: Update `_extract_method`**

Replace `_extract_method()` with:

```python
def _extract_method(node: Node) -> MethodInfo | None:
    """Extract method info from a method_declaration node."""
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    name = _node_text(name_node)
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
```

**Step 7: Update `_extract_type`**

Add modifier/annotation/permits collection in `_extract_type()`, before the body extraction:

```python
    # Modifiers and annotations
    info.modifiers = _collect_modifiers(node)
    info.annotations = _collect_annotations(node)

    # Permits clause (sealed classes)
    for c in node.children:
        if _node_text(c) == "permits":
            idx = list(node.children).index(c)
            for sibling in node.children[idx + 1:]:
                if sibling.type == "type_list":
                    for tc in sibling.children:
                        if tc.type in ("type_identifier", "generic_type", "scoped_type_identifier"):
                            info.permits.append(_simple_type_name(tc) or _type_name(tc))
                    break
                if sibling.type in ("type_identifier",):
                    info.permits.append(_node_text(sibling))
                if sibling.type == "{":
                    break
```

**Step 8: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: all tests pass

**Step 9: Commit**

```bash
git add integrations/javalang/pipeline/ts_extract.py tests/test_scaffold_pipeline.py
git commit -m "feat: extract modifiers, annotations, and permits from Java source"
```

---

### Task 3: Update scaffold_builder.py to use modifier data + ABC/Protocol semantics

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py`
- Modify: `integrations/javalang/pipeline/python_emitter.py`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write the failing tests**

Add to `tests/test_scaffold_pipeline.py`:

```python
from integrations.javalang.pipeline.scaffold_builder import build_module, _build_class


def test_static_field_becomes_class_var():
    info = extract_file("public class Foo { public static final String NAME = \"x\"; }")
    cls = _build_class(info.types[0])
    static_fields = [f for f in cls.fields if f.is_class_var]
    assert len(static_fields) == 1
    assert static_fields[0].name == "name"  # snake_cased
    assert static_fields[0].is_init is False


def test_abstract_class_gets_abc():
    info = extract_file("public abstract class Foo { public abstract void run(); }")
    cls = _build_class(info.types[0])
    assert cls.is_abstract is True
    assert "ABC" in cls.bases
    m = cls.methods[0]
    assert m.is_abstract is True
    assert m.body_lines == []
    assert any("@abstractmethod" in d.expr for d in m.decorators)


def test_interface_extends_keeps_protocol():
    info = extract_file("public interface HasUID extends Serializable { String uid(); }")
    cls = _build_class(info.types[0])
    assert "Serializable" in cls.bases
    assert "Protocol" in cls.bases


def test_class_annotations_in_source_meta():
    info = extract_file("@Deprecated public class Foo { }")
    cls = _build_class(info.types[0])
    assert "Deprecated" in cls.source_meta.get("annotations", [])


def test_sealed_permits_in_source_meta():
    info = extract_file("public sealed class Shape permits Circle, Square { }")
    cls = _build_class(info.types[0])
    assert set(cls.source_meta.get("permits", [])) == {"Circle", "Square"}
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "class_var or abc or protocol or annotations_in or sealed_permits" -v`
Expected: FAIL

**Step 3: Update `_build_class` in scaffold_builder.py**

```python
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
    is_abstract = "abstract" in getattr(ti, 'modifiers', [])
    is_final = "final" in getattr(ti, 'modifiers', [])
    has_abstract_methods = any(getattr(m, 'is_abstract', False) for m in ti.methods)

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
        is_static = getattr(f, 'is_static', False) and getattr(f, 'is_final', False)
        fields.append(_build_field(f, is_static=is_static))

    # Methods
    methods = [_build_method(m) for m in ti.methods]

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
    if hasattr(ti, 'annotations') and ti.annotations:
        source_meta["annotations"] = ti.annotations
    if hasattr(ti, 'modifiers') and ti.modifiers:
        source_meta["modifiers"] = ti.modifiers
    if hasattr(ti, 'permits') and ti.permits:
        source_meta["permits"] = ti.permits

    return ClassSpec(
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
```

**Step 4: Update `_build_method` for abstract + @abstractmethod**

```python
def _build_method(mi: MethodInfo) -> MethodSpec:
    """Convert a tree-sitter MethodInfo to a scaffold MethodSpec."""
    kind = "static" if mi.is_static else "instance"
    is_abstract = getattr(mi, 'is_abstract', False)
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
```

**Step 5: Update emitter for abstract methods**

In `python_emitter.py`, update `_emit_method`:

```python
    # Body
    if spec.is_abstract:
        lines.append(f"{indent}    ...")
    elif spec.body_lines:
        for bl in spec.body_lines:
            lines.append(f"{indent}    {bl}")
    else:
        lines.append(f"{indent}    pass")
```

**Step 6: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: all pass

**Step 7: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py integrations/javalang/pipeline/python_emitter.py tests/test_scaffold_pipeline.py
git commit -m "fix: static fields, abstract methods with ABC/@abstractmethod, Protocol in interface extends"
```

---

### Task 4: Fix import collection — walk full type tree

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write the failing tests**

```python
from integrations.javalang.pipeline.python_emitter import emit
from integrations.javalang.pipeline.symbol_registry import SymbolRegistry


def _build_and_emit(java_source: str) -> str:
    """Helper: Java source → Python source string."""
    info = extract_file(java_source)
    registry = SymbolRegistry()
    module = build_module(info, Path("Test.java"), Path("test/Test.java"), "engine", registry)
    return emit(module)


def test_classvar_import_emitted():
    source = "public class Foo { public static final String NAME = \"x\"; }"
    py = _build_and_emit(source)
    assert "ClassVar" in py


def test_optional_import_emitted():
    source = "public class Foo { private Optional<String> name; }"
    py = _build_and_emit(source)
    assert "Optional" in py


def test_abc_import_emitted():
    source = "public abstract class Foo { public abstract void run(); }"
    py = _build_and_emit(source)
    assert "from abc import ABC, abstractmethod" in py


def test_field_default_factory_imports_field():
    source = 'public class Foo { @Builder.Default private List<String> items = new ArrayList<>(); }'
    py = _build_and_emit(source)
    assert "from dataclasses import dataclass, field" in py


def test_inner_enum_imports_enum():
    source = """
    public class Outer {
        public enum Status { RUNNING, STOPPED }
        private String name;
    }
    """
    py = _build_and_emit(source)
    assert "Enum" in py


def test_inner_dataclass_with_factory_imports_field():
    source = """
    public class Outer {
        public static class Inner { @Builder.Default private List<String> items = new ArrayList<>(); }
        private String name;
    }
    """
    py = _build_and_emit(source)
    assert "from dataclasses import dataclass, field" in py
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "import" -v`
Expected: FAIL — ClassVar, Optional, abc, inner class imports missing

**Step 3: Add `_collect_structural_needs` and `_collect_typing_needs`**

Add to `scaffold_builder.py`:

```python
def _collect_structural_needs(types: list[ClassSpec]) -> dict[str, bool]:
    """Walk full type tree (including inner classes) for structural import needs."""
    needs = {"dataclass": False, "field": False, "enum": False, "protocol": False, "abc": False}
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
        sub = _collect_structural_needs(cls.inner_classes)
        for k in needs:
            needs[k] = needs[k] or sub[k]
    return needs


def _collect_typing_needs(types: list[ClassSpec]) -> set[str]:
    """Walk full type tree for typing module import needs."""
    needed: set[str] = set()
    for cls in types:
        for f in cls.fields:
            if f.is_class_var:
                needed.add("ClassVar")
            if "Optional" in f.type_str:
                needed.add("Optional")
        for m in cls.methods:
            if "Optional" in m.return_type:
                needed.add("Optional")
            for p in m.params:
                if "Optional" in p.type_str:
                    needed.add("Optional")
        needed |= _collect_typing_needs(cls.inner_classes)
    return needed
```

**Step 4: Replace import assembly in `build_module`**

Replace the existing import assembly block with:

```python
    # Collect all import needs from full type tree
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
        names = "dataclass, field" if structural["field"] else "dataclass"
        typing_imports.append(ImportSpec(module="dataclasses", name=names, kind="stdlib"))

    # enum imports
    if structural["enum"]:
        typing_imports.append(ImportSpec(module="enum", name="Enum", kind="stdlib"))

    # typing imports
    typing_names = sorted(typing_needs)
    typing_imports.append(ImportSpec(module="typing", name=", ".join(typing_names), kind="typing"))
```

**Step 5: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: all pass

**Step 6: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py tests/test_scaffold_pipeline.py
git commit -m "fix: walk full type tree for imports — ClassVar, Optional, ABC, inner classes"
```

---

### Task 5: Wire alias resolution + type reference rewriting

**Files:**
- Modify: `integrations/javalang/pipeline/symbol_registry.py`
- Modify: `integrations/javalang/pipeline/scaffold_builder.py`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write the failing tests**

```python
from integrations.javalang.pipeline.symbol_registry import SymbolRegistry, RegistryEntry


def test_conflicting_symbols_resolve_with_import_context():
    registry = SymbolRegistry()
    registry.add(RegistryEntry(
        class_name="Task", module_path="engine.core.models.tasks.task",
        source_file="Task.java", source_module="core", kind="class",
        java_fqn="io.kestra.core.models.tasks.Task",
    ))
    registry.add(RegistryEntry(
        class_name="Task", module_path="engine.plugin.scripts.task",
        source_file="Task.java", source_module="scripts", kind="class",
        java_fqn="io.kestra.plugin.scripts.Task",
    ))
    registry.build_conflicts()

    path, alias = registry.resolve_with_alias(
        "Task",
        java_imports=["io.kestra.plugin.scripts.Task"],
        local_names=set(),
    )
    assert path == "engine.plugin.scripts.task"
    assert alias is None


def test_alias_when_name_already_taken():
    registry = SymbolRegistry()
    registry.add(RegistryEntry(
        class_name="Task", module_path="engine.core.models.tasks.task",
        source_file="Task.java", source_module="core", kind="class",
        java_fqn="io.kestra.core.models.tasks.Task",
    ))
    registry.add(RegistryEntry(
        class_name="Task", module_path="engine.plugin.scripts.task",
        source_file="Task.java", source_module="scripts", kind="class",
        java_fqn="io.kestra.plugin.scripts.Task",
    ))
    registry.build_conflicts()

    path, alias = registry.resolve_with_alias(
        "Task",
        java_imports=["io.kestra.plugin.scripts.Task"],
        local_names={"Task"},  # Task already used in this file
    )
    assert path == "engine.plugin.scripts.task"
    assert alias is not None
    assert alias != "Task"  # must be different
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "conflicting or alias" -v`
Expected: FAIL — resolve_with_alias signature doesn't accept local_names

**Step 3: Update `resolve_with_alias` in symbol_registry.py**

```python
    def resolve_with_alias(
        self, class_name: str,
        java_imports: list[str] | None = None,
        local_names: set[str] | None = None,
    ) -> tuple[str | None, str | None]:
        """Resolve and return (module_path, alias_or_None).

        If class_name is already in local_names, generate a deterministic alias
        derived from the module path to avoid shadowing.
        """
        module_path = self.resolve(class_name, java_imports)
        if module_path is None:
            return None, None

        if local_names and class_name in local_names:
            parts = module_path.split(".")
            if len(parts) >= 2:
                prefix = parts[-2].replace("_", " ").title().replace(" ", "")
                alias = f"{prefix}{class_name}"
            else:
                alias = f"_{class_name}"
            return module_path, alias

        return module_path, None
```

**Step 4: Add `_apply_aliases` to scaffold_builder.py**

```python
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
```

**Step 5: Update `build_module` to use aliases and rewrite types**

Replace the cross-file import resolution block:

```python
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
```

**Step 6: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: all pass

**Step 7: Commit**

```bash
git add integrations/javalang/pipeline/symbol_registry.py integrations/javalang/pipeline/scaffold_builder.py tests/test_scaffold_pipeline.py
git commit -m "fix: alias resolution with type reference rewriting for conflicting symbols"
```

---

### Task 6: End-to-end regression tests + baseline verification

**Files:**
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Capture baseline**

Run before any further changes:
```bash
cd E:\writing-system
python scripts/generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine --dry-run --report-json output/baseline_engine.json
python scripts/generate_scaffolds.py --source E:/KESTRA-IO/plugins --output integrations --prefix integrations --plugin-mode --dry-run --report-json output/baseline_integrations.json
```

Record the exact numbers from each report: `files_parsed`, `build_errors`, `emit_errors`, `warnings`.

**Step 2: Write end-to-end tests**

```python
def test_e2e_abstract_class_with_static_and_methods():
    java = """
    public abstract class AbstractFlow {
        public static final String TYPE = "flow";
        private String id;
        @NotNull private String namespace;
        public abstract void execute();
        public String getId() { return this.id; }
    }
    """
    py = _build_and_emit(java)

    # Imports
    assert "from abc import ABC, abstractmethod" in py
    assert "ClassVar" in py
    assert "from dataclasses import dataclass" in py

    # Class with ABC
    assert "ABC" in py

    # Static field as ClassVar
    assert "ClassVar[str]" in py

    # Instance fields
    assert "id: str | None = None" in py
    assert "namespace: str" in py

    # Abstract method with decorator and ... body
    assert "@abstractmethod" in py
    assert "def execute(self) -> None:" in py

    # Concrete method stubbed
    assert "def get_id(self) -> str:" in py
    assert "raise NotImplementedError" in py


def test_e2e_interface_with_extends_keeps_protocol():
    java = "public interface HasUID extends Serializable { String uid(); }"
    py = _build_and_emit(java)

    assert "class HasUID(Serializable, Protocol):" in py
    assert "def uid(self) -> str: ..." in py


def test_e2e_enum():
    java = "public enum State { RUNNING, STOPPED, FAILED }"
    py = _build_and_emit(java)

    assert "class State(str, Enum):" in py
    assert 'RUNNING = "RUNNING"' in py
    assert 'STOPPED = "STOPPED"' in py
    assert 'FAILED = "FAILED"' in py


def test_e2e_record():
    java = "public record Point(int x, int y) { }"
    py = _build_and_emit(java)

    assert "class Point" in py
    assert "@dataclass" in py
```

**Step 3: Run all tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v`
Expected: all pass

**Step 4: Run full pipeline and compare to baseline**

```bash
python scripts/generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine --dry-run --report-json output/fixed_engine.json
python scripts/generate_scaffolds.py --source E:/KESTRA-IO/plugins --output integrations --prefix integrations --plugin-mode --dry-run --report-json output/fixed_integrations.json
```

Compare each report JSON field-by-field against baseline:

| Counter | Constraint | Rationale |
|---------|-----------|-----------|
| `files_scanned` | == baseline | Discovery logic unchanged |
| `files_parsed` | == baseline | Parser unchanged |
| `parse_errors` | == baseline | Parser unchanged |
| `modules_built` | >= baseline | Fixes may recover previously failing builds |
| `build_errors` | <= baseline | Fixes must not introduce new build failures |
| `files_emitted` | >= baseline | Fixes may recover previously failing emissions |
| `emit_errors` | <= baseline | Fixes must not introduce new emit failures |
| `types.classes` | == baseline | Type counts unchanged |
| `types.interfaces` | == baseline | Type counts unchanged |
| `types.enums` | == baseline | Type counts unchanged |
| `types.records` | == baseline | Type counts unchanged |
| `members.fields` | == baseline | Member counts unchanged |
| `members.methods` | == baseline | Member counts unchanged |
| `conflicts` | == baseline | Registry conflicts are input data, not affected by fixes |
| `warnings` | report delta | New warnings from alias detection are acceptable; others must not increase |

If any counter violates its constraint, investigate before proceeding.

**Step 5: Commit**

```bash
git add tests/test_scaffold_pipeline.py
git commit -m "test: end-to-end scaffold pipeline regression tests with baseline verification"
```

---

## Out Of Scope

- Lombok interpretation (`@Data`, `@Value`, `@Builder`, `@Slf4j`)
- Method body translation (Tier 1/2/3)
- Getter/setter filtering optimization
- Nested generic annotation stripping in preprocess.py
- `var` context-awareness in preprocess.py
- `@interface` annotation type handling
- `type_params` emission (Generic[T])

## Acceptance Criteria

- `interface Child extends Parent {}` produces extends=["Parent"] in TypeInfo
- Interface extends emits `class Child(Parent, Protocol):` — Protocol always present
- `public static final String NAME = "x"` produces `is_class_var=True` FieldSpec with `ClassVar` import
- `public abstract void run()` produces `is_abstract=True` MethodSpec with `@abstractmethod`, `...` body, `ABC` in class bases, and `from abc import ABC, abstractmethod`
- Files with `Optional` fields emit `Optional` in typing imports
- Inner classes with enum/dataclass/default_factory trigger correct imports
- Conflicting class names produce deterministic aliases AND type references are rewritten to use the alias
- All regression tests pass
- Full pipeline dry run: all 15 report counters pass constraints (see Task 6 Step 4 table)

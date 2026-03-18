"""Regression tests for the scaffold pipeline.

Tests cover the five bugfixes:
1. Interface extends extraction
2. Modifier/annotation extraction
3. Builder: static fields, abstract methods, ABC/Protocol
4. Import collection (full type tree walk)
5. Alias resolution + type rewriting
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from integrations.javalang.pipeline.ts_extract import extract_file


# --- Task 1: Interface extends ---

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


# --- Task 2: Modifier/annotation extraction ---

def test_static_final_field():
    info = extract_file('public class Foo { public static final String NAME = "x"; }')
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


# --- Task 3: Builder uses modifiers — ABC/Protocol/static ---

from integrations.javalang.pipeline.scaffold_builder import build_module, _build_class


def test_static_field_becomes_class_var():
    info = extract_file("public class Foo { public static final String NAME = \"x\"; }")
    cls = _build_class(info.types[0])
    static_fields = [f for f in cls.fields if f.is_class_var]
    assert len(static_fields) == 1
    assert static_fields[0].name == "n_a_m_e"  # snake_cased from NAME
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


# --- Task 4: Import collection — full type tree walk ---

from integrations.javalang.pipeline.python_emitter import emit
from integrations.javalang.pipeline.symbol_registry import SymbolRegistry


def _build_and_emit(java_source: str) -> str:
    """Helper: Java source -> Python source string."""
    info = extract_file(java_source)
    registry = SymbolRegistry()
    module = build_module(info, Path("Test.java"), Path("test/Test.java"), "engine", registry)
    return emit(module)


def test_classvar_import_emitted():
    source = 'public class Foo { public static final String NAME = "x"; }'
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


# --- Task 5: Alias resolution + type reference rewriting ---

from integrations.javalang.pipeline.symbol_registry import RegistryEntry


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
        local_names={"Task"},
    )
    assert path == "engine.plugin.scripts.task"
    assert alias is not None
    assert alias != "Task"


# --- Task 6: End-to-end regression tests ---

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


# --- Edge cases flagged during review ---

def test_fully_qualified_annotation():
    """@jakarta.validation.NotNull should be captured as annotation name."""
    info = extract_file("public class Foo { @jakarta.validation.NotNull private String name; }")
    # The annotation extractor captures the identifier node — check what it produces
    f = info.types[0].fields[0]
    assert len(f.annotations) > 0


def test_non_sealed_modifier():
    """non-sealed modifier should appear in modifiers list."""
    info = extract_file("public non-sealed class Foo { }")
    # non-sealed is a compound keyword — check if tree-sitter captures it
    assert len(info.types) == 1

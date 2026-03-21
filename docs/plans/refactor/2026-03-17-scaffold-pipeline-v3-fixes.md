# Scaffold Pipeline v3 — Name Mangling, Initializer Cleanup, Preprocessor Fixes, Lombok Pass

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the four remaining scaffold pipeline bugs (_to_snake mangling, Java initializer passthrough, nested generics, context-blind var), add the Lombok interpretation pass, and prune redundant getter stubs — then re-run the pipeline to regenerate all 1,474 engine scaffolds.

**Architecture:** All fixes are in `integrations/javalang/pipeline/`. The v2 bugfix plan (already executed) fixed extraction-level bugs. This plan targets the *builder* and *preprocessor* layers: name conversion, default-value sanitization, preprocessing robustness, and a new Lombok-to-dataclass pass. After all fixes, we re-run `scripts/generate_scaffolds.py` once to regenerate everything.

**Tech Stack:** Python, tree-sitter-java, pytest. Pipeline lives in `integrations/javalang/pipeline/`. Generator script is `scripts/generate_scaffolds.py`.

**Baseline metrics** (before this plan):
- 1,474 engine scaffolds
- 144 files with mangled names (`a__b` pattern)
- 73 files with residual Java syntax (`.class.`, `new `, `@Override`)
- 834 files with unresolved type warnings
- Lombok in Java source: 193 @Getter, 130 @NoArgsConstructor, 114 @Builder, 59 @Slf4j, 46 @Value, 18 @Data

---

## File Layout

All changes in:
- `integrations/javalang/pipeline/scaffold_builder.py` (Tasks 1, 2, 5, 6)
- `integrations/javalang/pipeline/symbol_registry.py` (Task 1 — has duplicate `_to_snake`)
- `integrations/javalang/pipeline/preprocess.py` (Tasks 3, 4)
- `tests/test_scaffold_pipeline.py` (all tasks — extend existing test file)

---

## Phase 1: Bug Fixes

### Task 1: Fix `_to_snake` for UPPER_SNAKE_CASE constants

The camelCase→snake_case regex inserts `_` before every capital letter. Java constants like `DEFAULT_FILE_NAME` become `d_e_f_a_u_l_t__f_i_l_e__n_a_m_e`. Affects 144 generated files.

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py:20,68-69`
- Modify: `integrations/javalang/pipeline/symbol_registry.py:15,18-19`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

Add to `tests/test_scaffold_pipeline.py`:

```python
from integrations.javalang.pipeline.scaffold_builder import _to_snake


def test_to_snake_camel_case():
    assert _to_snake("camelCase") == "camel_case"
    assert _to_snake("getTaskDefaults") == "get_task_defaults"
    assert _to_snake("flowId") == "flow_id"


def test_to_snake_upper_snake_case():
    assert _to_snake("DEFAULT_FILE_NAME") == "default_file_name"
    assert _to_snake("NON_DEFAULT_OBJECT_MAPPER") == "non_default_object_mapper"
    assert _to_snake("ASSET_TYPE") == "asset_type"
    assert _to_snake("TYPE") == "type"
    assert _to_snake("EMPTY_MAP") == "empty_map"


def test_to_snake_single_word():
    assert _to_snake("name") == "name"
    assert _to_snake("Name") == "name"


def test_to_snake_abbreviations():
    assert _to_snake("URL") == "url"
    assert _to_snake("SLA") == "sla"
    assert _to_snake("UID") == "uid"
    assert _to_snake("getURL") == "get_url"
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "to_snake" -v`
Expected: `test_to_snake_upper_snake_case` and `test_to_snake_abbreviations` FAIL

**Step 3: Fix `_to_snake` in scaffold_builder.py**

Replace lines 20 and 68-69:

```python
CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")
UPPER_SNAKE_RE = re.compile(r'^[A-Z][A-Z0-9_]*$')
ABBREV_RE = re.compile(r'([A-Z]+)([A-Z][a-z])')


def _to_snake(name: str) -> str:
    """Convert Java name to Python snake_case.

    Handles camelCase, UPPER_SNAKE_CASE, and abbreviations like URL, SLA.
    """
    if UPPER_SNAKE_RE.match(name):
        return name.lower()
    # Break apart abbreviation runs: getURL -> get_URL -> get_url
    name = ABBREV_RE.sub(r'\1_\2', name)
    return CAMEL_RE.sub("_", name).lower()
```

**Step 4: Apply same fix in symbol_registry.py**

Replace lines 15 and 18-19 with the same pattern:

```python
CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")
UPPER_SNAKE_RE = re.compile(r'^[A-Z][A-Z0-9_]*$')
ABBREV_RE = re.compile(r'([A-Z]+)([A-Z][a-z])')


def _to_snake(name: str) -> str:
    if UPPER_SNAKE_RE.match(name):
        return name.lower()
    name = ABBREV_RE.sub(r'\1_\2', name)
    return CAMEL_RE.sub("_", name).lower()
```

**Step 5: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "to_snake" -v`
Expected: all pass

**Step 6: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py integrations/javalang/pipeline/symbol_registry.py tests/test_scaffold_pipeline.py
git commit -m "fix: _to_snake handles UPPER_SNAKE_CASE and abbreviations without mangling"
```

---

### Task 2: Sanitize untranslatable Java initializers in `_map_default`

The fallback in `_map_default` passes through arbitrary Java expressions. Multi-line method chains, `new` expressions with anonymous classes, `.class.getName()` calls — all emitted as Python and cause immediate syntax/runtime errors. Affects 73 files.

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py:123-157`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

```python
from integrations.javalang.pipeline.scaffold_builder import _map_default


def test_map_default_simple_values():
    assert _map_default("true", "bool") == ("True", None)
    assert _map_default("false", "bool") == ("False", None)
    assert _map_default("null", "Any") == ("None", None)
    assert _map_default('"hello"', "str") == ('"hello"', None)
    assert _map_default("42", "int") == ("42", None)
    assert _map_default("42L", "int") == ("42", None)


def test_map_default_collections():
    assert _map_default("new ArrayList<>()", "list") == (None, "list")
    assert _map_default("new HashMap<>()", "dict") == (None, "dict")
    assert _map_default("new HashSet<>()", "set") == (None, "set")


def test_map_default_java_method_chain_dropped():
    expr, factory = _map_default("JacksonMapper.ofYaml().copy()", "Any")
    assert expr is None
    assert factory is None


def test_map_default_new_expression_dropped():
    expr, factory = _map_default("new JacksonAnnotationIntrospector() { @Override }", "Any")
    assert expr is None
    assert factory is None


def test_map_default_class_reflection_dropped():
    expr, factory = _map_default("External.class.getName()", "str")
    assert expr is None
    assert factory is None


def test_map_default_enum_ref_kept():
    """Simple enum references like Type.FOO are safe Python syntax."""
    expr, factory = _map_default("Type.FOO", "str")
    assert expr == "Type.FOO"
    assert factory is None
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "map_default" -v`
Expected: `java_method_chain_dropped`, `new_expression_dropped`, `class_reflection_dropped` FAIL (currently pass through as-is)

**Step 3: Fix `_map_default`**

Replace the function in `scaffold_builder.py`:

```python
# Pattern for Java expressions that cannot be valid Python
_JAVA_EXPR_RE = re.compile(
    r'new\s+'           # new keyword
    r'|\.class\b'       # .class reflection
    r'|@\w+'            # annotations
    r'|\)\s*\{'         # anonymous class body
    r'|\(\)\s*\.'       # method chain: foo().bar()
)

# Pattern for simple enum-style references: Type.VALUE (no parens, no chains)
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

    # Drop anything with parentheses (method calls) we can't translate
    if '(' in stripped:
        return None, None

    # Anything else — keep if it looks like a simple identifier or literal
    return stripped, None
```

**Step 4: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "map_default" -v`
Expected: all pass

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py tests/test_scaffold_pipeline.py
git commit -m "fix: drop untranslatable Java initializers instead of emitting broken syntax"
```

---

### Task 3: Fix nested generics annotation stripping in preprocessor

The regex `[^>]*` stops at the first `>`. Input like `Map<String, List<@NonNull String>>` — the inner `>` terminates the match, so `@NonNull` survives. Needs bracket-depth-aware stripping.

**Files:**
- Modify: `integrations/javalang/pipeline/preprocess.py:58-73`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

```python
from integrations.javalang.pipeline.preprocess import _strip_type_annotations_in_generics


def test_strip_simple_generic_annotation():
    assert _strip_type_annotations_in_generics("List<@NonNull String>") == "List<String>"


def test_strip_annotation_with_args():
    assert _strip_type_annotations_in_generics("Property<@Min(0) Integer>") == "Property<Integer>"


def test_strip_nested_generic_annotation():
    result = _strip_type_annotations_in_generics("Map<String, List<@NonNull String>>")
    assert result == "Map<String, List<String>>"


def test_strip_deeply_nested():
    result = _strip_type_annotations_in_generics(
        "Map<@NonNull String, List<@Nullable Map<String, @Valid Integer>>>"
    )
    assert "@" not in result


def test_strip_preserves_non_generic_annotations():
    """Annotations outside generics are untouched."""
    result = _strip_type_annotations_in_generics("@NotNull List<String>")
    assert result == "@NotNull List<String>"
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "strip" -v`
Expected: `test_strip_nested_generic_annotation` and `test_strip_deeply_nested` FAIL

**Step 3: Replace with bracket-depth-aware scanner**

Replace `_strip_type_annotations_in_generics` in `preprocess.py`:

```python
def _strip_type_annotations_in_generics(source: str) -> str:
    """Remove type-use annotations inside generic brackets.

    List<@NonNull String> -> List<String>
    Map<String, List<@NonNull String>> -> Map<String, List<String>>

    Uses a character-level scanner that tracks <> depth to handle nesting.
    """
    result = []
    i = 0
    depth = 0
    n = len(source)

    while i < n:
        ch = source[i]

        if ch == '<':
            depth += 1
            result.append(ch)
            i += 1
        elif ch == '>':
            depth = max(0, depth - 1)
            result.append(ch)
            i += 1
        elif ch == '@' and depth > 0:
            # Inside generics — consume the annotation
            i += 1  # skip @
            # Consume annotation name: word chars and dots
            while i < n and (source[i].isalnum() or source[i] in ('_', '.')):
                i += 1
            # Consume optional parenthesized args: @Min(0)
            if i < n and source[i] == '(':
                paren_depth = 1
                i += 1
                while i < n and paren_depth > 0:
                    if source[i] == '(':
                        paren_depth += 1
                    elif source[i] == ')':
                        paren_depth -= 1
                    i += 1
            # Consume trailing whitespace
            while i < n and source[i] == ' ':
                i += 1
        else:
            result.append(ch)
            i += 1

    return ''.join(result)
```

**Step 4: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "strip" -v`
Expected: all pass

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/preprocess.py tests/test_scaffold_pipeline.py
git commit -m "fix: bracket-depth-aware annotation stripping handles nested generics"
```

---

### Task 4: Fix context-blind `var` replacement

`\bvar\s+(\w)` matches `var` inside string literals and comments. Lower severity since method bodies are stubs, but can corrupt field initializers.

**Files:**
- Modify: `integrations/javalang/pipeline/preprocess.py:76-82`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

```python
from integrations.javalang.pipeline.preprocess import _strip_var_keyword


def test_var_in_local_declaration():
    assert "Object x" in _strip_var_keyword("    var x = foo();")


def test_var_in_for_loop():
    assert "Object item" in _strip_var_keyword("for (var item : list)")


def test_var_inside_string_unchanged():
    source = 'String s = "this var x is inside";'
    assert _strip_var_keyword(source) == source


def test_var_in_comment_unchanged():
    source = "// var x should not change"
    assert _strip_var_keyword(source) == source
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "var" -v`
Expected: `var_inside_string_unchanged` and `var_in_comment_unchanged` FAIL

**Step 3: Fix `_strip_var_keyword`**

Replace in `preprocess.py`:

```python
def _strip_var_keyword(source: str) -> str:
    """Replace var with Object in local variable declarations.

    var x = foo() -> Object x = foo()
    for (var item : list) -> for (Object item : list)

    Only matches var at statement positions — not inside strings or comments.
    """
    # Process line by line to respect string/comment boundaries
    lines = source.split('\n')
    result = []
    for line in lines:
        stripped = line.lstrip()
        # Skip comment lines
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            result.append(line)
            continue
        # Only replace var before the first string literal on the line
        string_start = _find_first_string(line)
        if string_start == -1:
            # No string on this line — safe to replace everywhere
            result.append(re.sub(r'\bvar\s+(\w)', r'Object \1', line))
        else:
            # Replace only in the prefix before the string
            prefix = line[:string_start]
            suffix = line[string_start:]
            result.append(re.sub(r'\bvar\s+(\w)', r'Object \1', prefix) + suffix)
    return '\n'.join(result)


def _find_first_string(line: str) -> int:
    """Find index of first unescaped quote in a line, or -1."""
    i = 0
    while i < len(line):
        if line[i] == '"' and (i == 0 or line[i-1] != '\\'):
            return i
        if line[i] == "'" and (i == 0 or line[i-1] != '\\'):
            return i
        i += 1
    return -1
```

**Step 4: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "var" -v`
Expected: all pass

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/preprocess.py tests/test_scaffold_pipeline.py
git commit -m "fix: var replacement respects string literals and comments"
```

---

## Phase 2: Enhancements

### Task 5: Add Lombok interpretation pass

193 `@Getter`, 114 `@Builder`, 59 `@Slf4j`, 46 `@Value`, 18 `@Data` across Kestra core. A single `_apply_lombok` function reads `source_meta["annotations"]` and sets the right dataclass semantics. One function, one call site, lifts structural readiness from ~40% to ~90%.

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py`
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

```python
from integrations.javalang.pipeline.scaffold_builder import _build_class, _apply_lombok
from integrations.javalang.pipeline.ts_extract import extract_file


def test_lombok_value_makes_frozen():
    info = extract_file("@Value public class Foo { private String name; }")
    cls = _build_class(info.types[0])
    _apply_lombok(cls)
    assert any("frozen=True" in d.expr for d in cls.decorators)


def test_lombok_slf4j_adds_logger():
    info = extract_file("@Slf4j public class Foo { private String name; }")
    cls = _build_class(info.types[0])
    _apply_lombok(cls)
    logger_fields = [f for f in cls.fields if f.name == "logger"]
    assert len(logger_fields) == 1
    assert logger_fields[0].is_class_var is True


def test_lombok_data_keeps_dataclass():
    info = extract_file("@Data public class Foo { private String name; }")
    cls = _build_class(info.types[0])
    _apply_lombok(cls)
    assert any("@dataclass" in d.expr for d in cls.decorators)


def test_lombok_value_overrides_data():
    """@Value takes precedence — frozen + eq."""
    info = extract_file("@Value @Data public class Foo { private String name; }")
    cls = _build_class(info.types[0])
    _apply_lombok(cls)
    assert any("frozen=True" in d.expr for d in cls.decorators)


def test_no_lombok_unchanged():
    info = extract_file("public class Foo { private String name; }")
    cls = _build_class(info.types[0])
    original_decorators = [d.expr for d in cls.decorators]
    _apply_lombok(cls)
    assert [d.expr for d in cls.decorators] == original_decorators
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "lombok" -v`
Expected: FAIL — `_apply_lombok` does not exist

**Step 3: Implement `_apply_lombok`**

Add to `scaffold_builder.py`, after `_build_class`:

```python
def _apply_lombok(cls: ClassSpec) -> None:
    """Interpret Lombok annotations from source_meta and apply Python equivalents.

    Mutates cls in place. Handles:
    - @Value → frozen=True dataclass (immutable)
    - @Slf4j → ClassVar logger field + logging import signal
    - @Data → no change (already a dataclass)
    - @Builder / @SuperBuilder → no change (kw_only=True already set)
    - @Getter / @Setter → no change (dataclass fields are accessible)
    - @NoArgsConstructor / @AllArgsConstructor → no change (dataclass handles this)
    """
    annotations = set(cls.source_meta.get("annotations", []))
    if not annotations:
        return

    # @Value → frozen immutable dataclass
    if "Value" in annotations:
        cls.decorators = [
            d if "@dataclass" not in d.expr
            else DecoratorSpec(expr="@dataclass(frozen=True, slots=True, kw_only=True)")
            for d in cls.decorators
        ]

    # @Slf4j → add logger as class-level field
    if "Slf4j" in annotations:
        logger_field = FieldSpec(
            name="logger",
            type_str="logging.Logger",
            original_name="log",
            default_expr="logging.getLogger(__name__)",
            is_class_var=True,
            is_init=False,
        )
        # Prepend so it appears before instance fields
        cls.fields.insert(0, logger_field)
```

**Step 4: Wire `_apply_lombok` into `_build_class`**

In `_build_class`, add one line just before the `return ClassSpec(...)` statement:

```python
    # ... (existing code that builds source_meta) ...

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
```

**Step 5: Update `build_module` to add `logging` import when needed**

In `build_module`, after `structural = _collect_structural_needs(types)`, add:

```python
    # Check if any class has a logger field (from @Slf4j)
    needs_logging = any(
        any(f.name == "logger" and "logging" in (f.type_str or "") for f in cls.fields)
        for cls in types
    )
    if needs_logging:
        typing_imports.append(ImportSpec(module="logging", name="logging", kind="stdlib"))
```

Note: this needs to go where `typing_imports` is being built, after the `typing_imports: list[ImportSpec] = []` line and before the final combination.

**Step 6: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "lombok" -v`
Expected: all pass

**Step 7: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py tests/test_scaffold_pipeline.py
git commit -m "feat: Lombok interpretation pass — @Value frozen, @Slf4j logger, annotations to dataclass semantics"
```

---

### Task 6: Prune redundant getter stubs

Every `getName()` becomes `get_name(self) -> str: raise NotImplementedError`. On a dataclass with a `name` field, this is noise. Skip `get*`/`is*` methods when a matching field exists.

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py` (`_build_class`)
- Modify: `tests/test_scaffold_pipeline.py`

**Step 1: Write failing tests**

```python
def test_getter_pruned_when_field_exists():
    java = """
    public class Foo {
        private String name;
        private boolean active;
        public String getName() { return this.name; }
        public boolean isActive() { return this.active; }
        public void execute() { }
    }
    """
    info = extract_file(java)
    cls = _build_class(info.types[0])
    method_names = [m.name for m in cls.methods]
    assert "get_name" not in method_names, "getter should be pruned — field 'name' exists"
    assert "is_active" not in method_names, "is-getter should be pruned — field 'active' exists"
    assert "execute" in method_names, "non-getter methods should be kept"


def test_getter_kept_when_no_field():
    java = """
    public class Foo {
        public String getDisplayName() { return ""; }
    }
    """
    info = extract_file(java)
    cls = _build_class(info.types[0])
    method_names = [m.name for m in cls.methods]
    assert "get_display_name" in method_names, "getter without matching field should be kept"
```

**Step 2: Run tests to verify they fail**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "getter" -v`
Expected: `test_getter_pruned_when_field_exists` FAIL — get_name and is_active still present

**Step 3: Add getter pruning in `_build_class`**

In `_build_class`, after building the methods list (`methods = [_build_method(m) for m in ti.methods]`), add:

```python
    # Prune redundant getter stubs — get*/is* methods that duplicate a field
    field_names = {f.name for f in ti.fields}  # original Java names
    field_names_snake = {_to_snake(f.name) for f in ti.fields}

    def _is_redundant_getter(mi: MethodInfo) -> bool:
        name = mi.name
        if name.startswith("get") and len(name) > 3:
            # getName -> name (lowercase first char of suffix)
            inferred = name[3].lower() + name[4:]
            return inferred in field_names or _to_snake(inferred) in field_names_snake
        if name.startswith("is") and len(name) > 2:
            inferred = name[2].lower() + name[3:]
            return inferred in field_names or _to_snake(inferred) in field_names_snake
        return False

    methods = [_build_method(m) for m in ti.methods if not _is_redundant_getter(m)]
```

This replaces the existing `methods = [_build_method(m) for m in ti.methods]` line.

**Step 4: Run tests**

Run: `cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -k "getter" -v`
Expected: all pass

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py tests/test_scaffold_pipeline.py
git commit -m "feat: prune redundant get*/is* stubs when matching dataclass field exists"
```

---

## Phase 3: Validate

### Task 7: Re-run pipeline and validate metrics

**Step 1: Dry run to compare metrics**

```bash
cd E:\writing-system
python scripts/generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine --dry-run --report-json output/v3_dry_run.json
```

Compare against baseline:
- `files_scanned` == baseline (discovery unchanged)
- `files_parsed` == baseline (parser unchanged)
- `build_errors` <= baseline
- `emit_errors` <= baseline

**Step 2: Full regeneration**

```bash
cd E:\writing-system
python scripts/generate_scaffolds.py --source E:/KESTRA --output engine --prefix engine --report-json output/v3_engine.json
```

**Step 3: Spot-check quality**

Run the same audit that revealed the problems:

```bash
cd E:\writing-system
python -c "
import re, os
mangled = classvar_ok = java_syntax = 0
total = 0
for root, dirs, files in os.walk('engine'):
    for f in files:
        if not f.endswith('.py'): continue
        total += 1
        content = open(os.path.join(root, f), encoding='utf-8', errors='replace').read()
        if re.search(r'[a-z]__[a-z]', content): mangled += 1
        if '.class.' in content or 'new ' in content or '@Override' in content: java_syntax += 1
print(f'Total: {total}')
print(f'Mangled names: {mangled} (was 144)')
print(f'Residual Java syntax: {java_syntax} (was 73)')
"
```

Expected:
- Mangled names: ~0 (down from 144)
- Residual Java syntax: ~0 (down from 73)

**Step 4: Verify key files**

Manually check these files that were broken before:
- `engine/core/models/flows/flow.py` — static fields should be `ClassVar[str]` with clean names, no Java method chains
- `engine/core/events/crud_event_type.py` — enum should be unchanged (already correct)
- Any `@Slf4j` class — should have `logger: ClassVar[logging.Logger] = logging.getLogger(__name__)`

**Step 5: Run all tests**

```bash
cd E:\writing-system && python -m pytest tests/test_scaffold_pipeline.py -v
```

Expected: all pass

**Step 6: Commit regenerated scaffolds**

```bash
git add engine/ tests/
git commit -m "chore: regenerate engine scaffolds with v3 pipeline fixes"
```

---

## Acceptance Criteria

| Metric | Before | Target |
|--------|--------|--------|
| Mangled field names (`a__b`) | 144 files | ~0 |
| Residual Java syntax | 73 files | ~0 |
| @Value classes → frozen dataclass | 0 | 46 |
| @Slf4j classes → logger field | 0 | 59 |
| Redundant getter stubs | ~hundreds | pruned when field exists |
| Nested generic annotations | survive stripping | fully stripped |
| Pipeline build/emit errors | baseline | <= baseline |

## Out of Scope

- Method body translation (Tier 1/2/3)
- `@interface` annotation type handling
- `type_params` emission (`Generic[T]`)
- Plugin connector scaffolds (GCS, MongoDB)
- Alias resolution improvements beyond what v2 shipped

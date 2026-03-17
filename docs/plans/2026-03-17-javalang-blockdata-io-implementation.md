# Javalang In Blockdata-io Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `javalang` as a first-class `blockdata-io` connector family so BlockData can parse Java source, extract imports/signatures, and build dependency maps through the same runtime contract as MongoDB.

**Architecture:** Vendor or install the MIT-licensed `javalang` library inside `blockdata-io`, wrap the stable source-level API in a `blockdata.connectors.javalang` family, and expose only verified top-level parser operations as runnable tasks. Keep parser-internal methods off the public surface for v1.

**Tech Stack:** Python, `blockdata-io`, `javalang`, dataclasses, existing `Task.run(RunContext)` runtime, existing registry/worker execution path.

---

## Verified Upstream API Surface

These are the verified top-level functions worth exposing as BlockData tasks:

- `javalang.tokenizer.tokenize(code, ignore_errors=False)`
- `javalang.tokenizer.reformat_tokens(tokens)`
- `javalang.parse.parse_expression(exp)`
- `javalang.parse.parse_member_signature(sig)`
- `javalang.parse.parse_constructor_signature(sig)`
- `javalang.parse.parse_type(s)`
- `javalang.parse.parse_type_signature(sig)`
- `javalang.parse.parse(s)`

These are useful, but should stay internal helpers in v1:

- `javalang.parser.Parser(tokens)` and its incremental parse methods
- AST node iteration/filtering via `javalang.ast.Node` / `javalang.tree`
- token classes from `javalang.tokenizer`

---

### Task 1: Add the dependency and license record

**Files:**
- Create: `E:\writing-system\docs\plans\2026-03-17-javalang-blockdata-io-implementation.md`
- Create: `E:\blockdata-io\third_party\javalang\README.md`
- Modify: `E:\blockdata-io\requirements.txt`
- Modify: `E:\blockdata-io\pyproject.toml` or equivalent dependency file if present
- Test: `E:\blockdata-io\tests\connectors\javalang\test_imports.py`

**Step 1: Write the failing test**

```python
def test_javalang_dependency_is_importable():
    import importlib

    module = importlib.import_module("javalang")
    assert module is not None
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_imports.py -v`
Expected: `ModuleNotFoundError: No module named 'javalang'`

**Step 3: Add the dependency**

- Add `javalang` to the Python dependency manifest for `blockdata-io`
- Record upstream source and MIT license in `third_party/javalang/README.md`
- Note exact upstream repo: `https://github.com/c2nes/javalang`

**Step 4: Run test to verify it passes**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_imports.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\requirements.txt E:\blockdata-io\third_party\javalang\README.md E:\blockdata-io\tests\connectors\javalang\test_imports.py
git commit -m "feat: add javalang dependency to blockdata-io"
```

### Task 2: Create the shared javalang service layer

**Files:**
- Create: `E:\blockdata-io\blockdata\connectors\javalang\__init__.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\service.py`
- Test: `E:\blockdata-io\tests\connectors\javalang\test_service.py`

**Step 1: Write the failing test**

```python
from blockdata.connectors.javalang.service import JavaLangService


def test_tokenize_returns_token_records():
    tokens = JavaLangService.tokenize("class Test {}")
    assert tokens
    assert tokens[0]["value"] == "class"
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_service.py::test_tokenize_returns_token_records -v`
Expected: import failure for `blockdata.connectors.javalang.service`

**Step 3: Write minimal implementation**

```python
import javalang


class JavaLangService:
    @staticmethod
    def tokenize(code: str, ignore_errors: bool = False) -> list[dict]:
        tokens = list(javalang.tokenizer.tokenize(code, ignore_errors=ignore_errors))
        return [
            {
                "type": token.__class__.__name__,
                "value": token.value,
                "position": list(token.position) if token.position else None,
                "javadoc": token.javadoc,
            }
            for token in tokens
        ]
```

Then add matching wrappers for:
- `reformat_tokens`
- `parse`
- `parse_expression`
- `parse_member_signature`
- `parse_constructor_signature`
- `parse_type`
- `parse_type_signature`

Also add AST serialization helpers so parsed nodes become JSON-safe dicts.

**Step 4: Run tests**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_service.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\blockdata\connectors\javalang\__init__.py E:\blockdata-io\blockdata\connectors\javalang\service.py E:\blockdata-io\tests\connectors\javalang\test_service.py
git commit -m "feat: add shared javalang service wrappers"
```

### Task 3: Expose the stable API as runnable tasks

**Files:**
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_file.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_expression.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\tokenize.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\reformat_tokens.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_member_signature.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_constructor_signature.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_type.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\parse_type_signature.py`
- Test: `E:\blockdata-io\tests\connectors\javalang\test_tasks.py`

**Step 1: Write the failing test**

```python
from blockdata.connectors.javalang.parse_file import ParseFile
from blockdata.core.runners.run_context import RunContext


def test_parse_file_task_returns_compilation_unit():
    task = ParseFile(code="package a; class Test {}")
    output = task.run(RunContext(variables={}))
    assert output["kind"] == "CompilationUnit"
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_tasks.py::test_parse_file_task_returns_compilation_unit -v`
Expected: import failure

**Step 3: Write minimal implementation**

Use the MongoDB pattern:
- each task is a dataclass
- each task accepts `Property[...]` or raw values
- each task calls the shared `JavaLangService`
- each task returns a JSON-safe output dataclass or dict

Task types to register:
- `blockdata.javalang.parse`
- `blockdata.javalang.tokenize`
- `blockdata.javalang.reformat_tokens`
- `blockdata.javalang.parse_expression`
- `blockdata.javalang.parse_member_signature`
- `blockdata.javalang.parse_constructor_signature`
- `blockdata.javalang.parse_type`
- `blockdata.javalang.parse_type_signature`

**Step 4: Run tests**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_tasks.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\blockdata\connectors\javalang E:\blockdata-io\tests\connectors\javalang\test_tasks.py
git commit -m "feat: add javalang runnable task family"
```

### Task 4: Add BlockData-native analysis tasks we actually need

**Files:**
- Create: `E:\blockdata-io\blockdata\connectors\javalang\extract_imports.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\extract_types.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\extract_signatures.py`
- Create: `E:\blockdata-io\blockdata\connectors\javalang\build_dependency_closure.py`
- Test: `E:\blockdata-io\tests\connectors\javalang\test_analysis_tasks.py`

**Step 1: Write the failing test**

```python
from blockdata.connectors.javalang.extract_imports import ExtractImports
from blockdata.core.runners.run_context import RunContext


def test_extract_imports_returns_import_list():
    code = "import io.kestra.core.models.tasks.Task; class Test {}"
    output = ExtractImports(code=code).run(RunContext(variables={}))
    assert output["imports"] == ["io.kestra.core.models.tasks.Task"]
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_analysis_tasks.py::test_extract_imports_returns_import_list -v`
Expected: import failure

**Step 3: Write minimal implementation**

These are the tasks BlockData actually needs:
- `extract_imports`
- `extract_types`
- `extract_signatures`
- `build_dependency_closure`

Keep them built on top of parsed ASTs from `JavaLangService.parse(...)`.

The dependency-closure task should accept:
- seed file paths
- import prefix filters
- source roots

and return:
- visited files
- unresolved imports
- dependency edges

**Step 4: Run tests**

Run: `pytest E:\blockdata-io\tests\connectors\javalang\test_analysis_tasks.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\blockdata\connectors\javalang E:\blockdata-io\tests\connectors\javalang\test_analysis_tasks.py
git commit -m "feat: add javalang analysis tasks"
```

### Task 5: Register the family in the runtime

**Files:**
- Modify: `E:\blockdata-io\blockdata\runtime\registry.py`
- Test: `E:\blockdata-io\tests\runtime\test_javalang_registry.py`

**Step 1: Write the failing test**

```python
from blockdata.runtime.registry import resolve_by_function_name


def test_registry_resolves_javalang_parse():
    assert resolve_by_function_name("javalang_parse") == "blockdata.javalang.parse"
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\runtime\test_javalang_registry.py -v`
Expected: FAIL

**Step 3: Register the tasks**

Add the javalang classes to the `_TASK_TYPES` mapping, mirroring the MongoDB pattern.

**Step 4: Run tests**

Run: `pytest E:\blockdata-io\tests\runtime\test_javalang_registry.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\blockdata\runtime\registry.py E:\blockdata-io\tests\runtime\test_javalang_registry.py
git commit -m "feat: register javalang runtime tasks"
```

### Task 6: Add runtime-level smoke tests for the Kestra use case

**Files:**
- Create: `E:\blockdata-io\tests\integration\test_javalang_kestra_ref.py`

**Step 1: Write the failing test**

```python
from blockdata.runtime.execution import execute_function, ExecutionRequest


def test_javalang_extract_imports_from_kestra_ref_file():
    code = open(r"E:\writing-system\core\kestra-ref\condition\Weekend.java", encoding="utf-8").read()
    result = execute_function(
        "javalang_extract_imports",
        ExecutionRequest(params={"code": code}, variables={}),
    )
    assert "io.kestra.core.models.conditions.Condition" in result.output["imports"]
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\blockdata-io\tests\integration\test_javalang_kestra_ref.py -v`
Expected: FAIL

**Step 3: Implement the missing glue**

Fix any serialization, registry, or service gaps exposed by the end-to-end test.

**Step 4: Run tests**

Run: `pytest E:\blockdata-io\tests\integration\test_javalang_kestra_ref.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\blockdata-io\tests\integration\test_javalang_kestra_ref.py
git commit -m "test: add javalang kestra-ref integration smoke tests"
```

## Out of Scope For V1

- Exposing every internal `javalang.parser.Parser.parse_*` method as a separate public task
- Java semantic resolution or symbol solving
- Java 9+ grammar support beyond what upstream `javalang` already supports
- Auto-translation from Java AST to Python code
- Platform API wrappers before the `blockdata-io` family is stable

## Recommended Public Function Set

Expose these in v1:

- `javalang_parse`
- `javalang_tokenize`
- `javalang_reformat_tokens`
- `javalang_parse_expression`
- `javalang_parse_member_signature`
- `javalang_parse_constructor_signature`
- `javalang_parse_type`
- `javalang_parse_type_signature`
- `javalang_extract_imports`
- `javalang_extract_types`
- `javalang_extract_signatures`
- `javalang_build_dependency_closure`

Do **not** expose raw parser internals in v1.


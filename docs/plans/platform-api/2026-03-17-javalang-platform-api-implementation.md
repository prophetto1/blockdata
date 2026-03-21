# Javalang Platform API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `javalang` to `platform-api` as a FastAPI-backed external service family, exposing the native upstream parse/tokenize functions through the existing plugin execution system and registering them in `service_registry` / `service_functions`.

**Architecture:** Keep `platform-api` as the execution plane. Use the existing flat `app/plugins/*.py` discovery model, with one Python file per exposed `javalang` function and one optional shared `javalang_base.py`. Do not add BlockData-specific analysis wrappers in v1; expose only native upstream `javalang` functions.

**Tech Stack:** FastAPI, existing `platform-api` plugin registry, `BasePlugin`, Supabase migrations, `javalang`, pytest.

---

## Scope Lock

This plan must not deviate from these decisions:

- target repo: `E:\writing-system\services\platform-api`
- execution plane: `platform-api` FastAPI plugin system
- discovery model: flat files under `app/plugins/`
- one Python file per exposed function
- native upstream `javalang` functions only in v1
- register all exposed functions in backend DB

## Functions To Expose

One file and one `BasePlugin` subclass per function:

1. `javalang_tokenize`
2. `javalang_reformat_tokens`
3. `javalang_parse`
4. `javalang_parse_expression`
5. `javalang_parse_member_signature`
6. `javalang_parse_constructor_signature`
7. `javalang_parse_type`
8. `javalang_parse_type_signature`

## File Layout

Plugin files must stay flat so current discovery works without recursion:

- `E:\writing-system\services\platform-api\app\plugins\javalang_base.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_tokenize.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_reformat_tokens.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse_expression.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse_member_signature.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse_constructor_signature.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse_type.py`
- `E:\writing-system\services\platform-api\app\plugins\javalang_parse_type_signature.py`

Tests:

- `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`
- `E:\writing-system\services\platform-api\tests\test_javalang_routes.py`

DB registration:

- `E:\writing-system\supabase\migrations\20260317xxxxxx_###_register_javalang_service.sql`

Dependency manifest:

- `E:\writing-system\services\platform-api\requirements.txt` or equivalent Python dependency file used by that service

---

### Task 1: Add the dependency

**Files:**
- Modify: `E:\writing-system\services\platform-api\requirements.txt` or the active dependency manifest
- Test: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing test**

```python
def test_javalang_dependency_is_importable():
    import importlib

    module = importlib.import_module("javalang")
    assert module is not None
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_dependency_is_importable -v`
Expected: `ModuleNotFoundError: No module named 'javalang'`

**Step 3: Add the dependency**

Add `javalang` to the actual dependency manifest used by `platform-api`.

**Step 4: Run test to verify it passes**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_dependency_is_importable -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\requirements.txt E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "feat: add javalang dependency to platform-api"
```

### Task 2: Add the shared base plugin

**Files:**
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_base.py`
- Test: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing test**

```python
from app.plugins.javalang_base import _serialize_token


def test_serialize_token_returns_json_safe_dict():
    import javalang

    token = next(javalang.tokenizer.tokenize("class Test {}"))
    data = _serialize_token(token)
    assert data["value"] == "class"
    assert data["type"] == token.__class__.__name__
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_serialize_token_returns_json_safe_dict -v`
Expected: import failure

**Step 3: Write minimal implementation**

Create helpers only for:
- token serialization
- AST serialization
- common bad-input error shaping

Do not add extra analysis helpers.

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\app\plugins\javalang_base.py E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "feat: add javalang shared plugin helpers"
```

### Task 3: Add `javalang_tokenize`

**Files:**
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_tokenize.py`
- Modify: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing test**

```python
from app.plugins.javalang_tokenize import JavalangTokenizePlugin
from app.domain.plugins.models import ExecutionContext


async def test_javalang_tokenize_plugin():
    plugin = JavalangTokenizePlugin()
    result = await plugin.run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert result.data["tokens"][0]["value"] == "class"
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_tokenize_plugin -v`
Expected: import failure

**Step 3: Write minimal implementation**

Plugin contract:
- `task_types = ["blockdata.javalang.tokenize"]`
- required param: `code`
- optional param: `ignore_errors`
- output: serialized token list

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_tokenize_plugin -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\app\plugins\javalang_tokenize.py E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "feat: add javalang tokenize plugin"
```

### Task 4: Add `javalang_reformat_tokens`

**Files:**
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_reformat_tokens.py`
- Modify: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing test**

```python
from app.plugins.javalang_reformat_tokens import JavalangReformatTokensPlugin
from app.domain.plugins.models import ExecutionContext


async def test_javalang_reformat_tokens_plugin():
    plugin = JavalangReformatTokensPlugin()
    result = await plugin.run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert isinstance(result.data["text"], str)
```

**Step 2: Run test to verify it fails**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_reformat_tokens_plugin -v`
Expected: import failure

**Step 3: Write minimal implementation**

Plugin contract:
- `task_types = ["blockdata.javalang.reformat_tokens"]`
- input: `code`
- behavior: tokenize, then call `javalang.tokenizer.reformat_tokens(...)`

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py::test_javalang_reformat_tokens_plugin -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\app\plugins\javalang_reformat_tokens.py E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "feat: add javalang reformat-tokens plugin"
```

### Task 5: Add the six parse plugins

**Files:**
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse.py`
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse_expression.py`
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse_member_signature.py`
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse_constructor_signature.py`
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse_type.py`
- Create: `E:\writing-system\services\platform-api\app\plugins\javalang_parse_type_signature.py`
- Modify: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing tests**

```python
from app.domain.plugins.models import ExecutionContext


async def test_javalang_parse_plugin():
    from app.plugins.javalang_parse import JavalangParsePlugin
    result = await JavalangParsePlugin().run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert result.data["ast"]["node_type"] == "CompilationUnit"


async def test_javalang_parse_expression_plugin():
    from app.plugins.javalang_parse_expression import JavalangParseExpressionPlugin
    result = await JavalangParseExpressionPlugin().run({"expression": "a + b"}, ExecutionContext())
    assert result.state == "SUCCESS"


async def test_javalang_parse_member_signature_plugin():
    from app.plugins.javalang_parse_member_signature import JavalangParseMemberSignaturePlugin
    result = await JavalangParseMemberSignaturePlugin().run({"signature": "void test()"}, ExecutionContext())
    assert result.state == "SUCCESS"
```

Add corresponding tests for:
- constructor signature
- type
- type signature

**Step 2: Run tests to verify they fail**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py -k javalang_parse -v`
Expected: import failures

**Step 3: Write minimal implementation**

Each file must contain:
- one `BasePlugin` subclass
- one `task_types` list with a single primary `blockdata.javalang.*` task type
- direct call to the matching upstream `javalang.parse.*` function
- serialized AST/result in `PluginOutput.data`

Parameter contract:
- `javalang_parse`: `code`
- `javalang_parse_expression`: `expression`
- `javalang_parse_member_signature`: `signature`
- `javalang_parse_constructor_signature`: `signature`
- `javalang_parse_type`: `type_source`
- `javalang_parse_type_signature`: `signature`

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py -k javalang_parse -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\app\plugins\javalang_parse*.py E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "feat: add javalang parse plugins"
```

### Task 6: Add route-level coverage

**Files:**
- Modify: `E:\writing-system\services\platform-api\tests\test_routes.py`
- Create or Modify: `E:\writing-system\services\platform-api\tests\test_javalang_routes.py`

**Step 1: Write the failing tests**

```python
def test_functions_endpoint_lists_javalang_functions(client):
    response = client.get("/functions")
    assert response.status_code == 200
    names = {row["function_name"] for row in response.json()}
    assert "javalang_tokenize" in names
    assert "javalang_parse" in names


def test_plugin_execution_route_executes_javalang_tokenize(client, auth_headers):
    response = client.post(
        "/javalang_tokenize",
        json={"params": {"code": "class Test {}"}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["output"]["state"] == "SUCCESS"
```

**Step 2: Run tests to verify they fail**

Run: `pytest E:\writing-system\services\platform-api\tests\test_routes.py E:\writing-system\services\platform-api\tests\test_javalang_routes.py -v`
Expected: FAIL because functions are not registered yet

**Step 3: Fix wiring issues**

Do not change route structure.
Only fix:
- dependency import issues
- plugin discovery issues
- serialization issues

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_routes.py E:\writing-system\services\platform-api\tests\test_javalang_routes.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\tests\test_routes.py E:\writing-system\services\platform-api\tests\test_javalang_routes.py
git commit -m "test: cover javalang plugin routes"
```

### Task 7: Register the service and functions in Supabase

**Files:**
- Create: `E:\writing-system\supabase\migrations\20260317xxxxxx_###_register_javalang_service.sql`
- Test: SQL review plus local API verification after migration

**Step 1: Write the migration**

Create one `service_registry` row:
- `service_type = 'integration'`
- `service_name = 'javalang'`
- `base_url = 'http://localhost:8000'`
- `primary_stage = 'parse'`
- `execution_plane = 'fastapi'`
- `config.origin = 'javalang'`

Create eight `service_functions` rows:
- `javalang_tokenize`
- `javalang_reformat_tokens`
- `javalang_parse`
- `javalang_parse_expression`
- `javalang_parse_member_signature`
- `javalang_parse_constructor_signature`
- `javalang_parse_type`
- `javalang_parse_type_signature`

Each row must include:
- `function_type = 'parse'`
- `bd_stage = 'parse'`
- `entrypoint = '/<function_name>'`
- `http_method = 'POST'`
- correct `parameter_schema`
- tags including `["javalang","java","parse"]`

**Step 2: Review against current schema**

Check against:
- `E:\writing-system\supabase\migrations\20260316020000_095_register_gcs_arangodb.sql`
- `E:\writing-system\supabase\migrations\20260302140000_062_eyecite_service_functions.sql`

Expected: migration uses current columns, not older schema columns.

**Step 3: Apply migration in the normal project workflow**

Run the project’s standard Supabase migration command.

Expected:
- service row exists
- 8 function rows exist

**Step 4: Verify app/database alignment**

Check:
- `/functions` lists all 8 functions
- `service_functions` rows match plugin-discovered names
- `entrypoint` values match FastAPI route names

**Step 5: Commit**

```bash
git add E:\writing-system\supabase\migrations\20260317xxxxxx_###_register_javalang_service.sql
git commit -m "feat: register javalang service functions"
```

### Task 8: Add real-source smoke tests

**Files:**
- Modify: `E:\writing-system\services\platform-api\tests\test_javalang_plugins.py`

**Step 1: Write the failing tests**

Use real inputs from:
- `E:\writing-system\core\kestra-ref\condition\Weekend.java`
- `E:\writing-system\core\kestra-ref\condition\DateTimeBetween.java`

```python
async def test_javalang_parse_handles_real_kestra_java():
    from pathlib import Path
    from app.plugins.javalang_parse import JavalangParsePlugin
    from app.domain.plugins.models import ExecutionContext

    code = Path(r"E:\writing-system\core\kestra-ref\condition\Weekend.java").read_text(encoding="utf-8")
    result = await JavalangParsePlugin().run({"code": code}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert result.data["ast"]["node_type"] == "CompilationUnit"
```

Add similar smoke coverage for:
- `tokenize`
- `parse_member_signature` with a realistic method signature snippet

**Step 2: Run tests to verify they fail**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py -k kestra -v`
Expected: FAIL until implementation is complete

**Step 3: Fix remaining issues**

Only fix:
- Unicode/serialization issues
- parser input handling
- output shape mismatches

**Step 4: Run tests**

Run: `pytest E:\writing-system\services\platform-api\tests\test_javalang_plugins.py -k kestra -v`
Expected: PASS

**Step 5: Commit**

```bash
git add E:\writing-system\services\platform-api\tests\test_javalang_plugins.py
git commit -m "test: add javalang real-source smoke coverage"
```

## Out Of Scope

- Any BlockData-specific wrapper functions like `extract_imports`
- Any dependency-closure or AST analysis helpers
- Any `blockdata-io` runtime family
- Any recursive subpackage plugin discovery rewrite
- Any service_functions rows beyond the 8 native upstream functions

## Acceptance Criteria

- `javalang` is importable in `platform-api`
- all 8 plugin files exist as flat files under `app/plugins/`
- each file defines one `BasePlugin` subclass
- `/functions` lists all 8 `javalang_*` functions
- `POST /javalang_*` executes through the existing plugin execution route
- `service_registry` has one `javalang` service row
- `service_functions` has 8 `javalang_*` rows
- real Kestra Java source parses successfully through the new plugins

## Notes

- Keep the file layout flat because current discovery uses `pkgutil.iter_modules(app.plugins.__path__)` and does not recurse into subpackages.
- Use one optional shared `javalang_base.py` only for serialization/common error handling.
- Do not add any extra analysis surface in this first plan.

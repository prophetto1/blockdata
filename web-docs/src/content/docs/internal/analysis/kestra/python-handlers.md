---
title: python-handlers
description: Strategy for generating Python handler functions from Kestra's Java plugin architecture.
---

## Problem

Kestra has 122+ Java plugins following a uniform architecture. We need Python handler equivalents for each plugin to integrate into our service layer without hand-writing each one.

## Kestra Plugin Architecture (Extraction Summary)

Every Kestra plugin follows this skeleton:

```
ConcreteTask extends AbstractConnection implements RunnableTask<Output>
  Property<T> fields      →  inputs  (typed, @Schema annotated)
  run(RunContext)          →  core logic
  static class Output     →  return schema
```

### Key Java-to-Python type mappings

| Java `Property<T>`         | Python type        |
| -------------------------- | ------------------ |
| `Property<String>`         | `str`              |
| `Property<Integer>`        | `int`              |
| `Property<Boolean>`        | `bool`             |
| `Property<Duration>`       | `timedelta`        |
| `Property<Map<String,String>>` | `dict[str, str]` |
| `Property<List<String>>`   | `list[str]`        |
| `Property<URI>`            | `str` (URI string) |

### The 6 handler families

| Family                  | Java pattern                | Python approach                          |
| ----------------------- | --------------------------- | ---------------------------------------- |
| **JDBC / Database**     | SQL in, rows/URI out        | `sqlalchemy` or native drivers           |
| **Cloud (AWS/GCP/Azure)** | SDK call with creds       | `boto3` / `google-cloud-*` / `azure-*`   |
| **Script (Python/Shell)** | Run code in container     | `subprocess` or direct execution         |
| **HTTP / Notification** | POST payload to URL         | `httpx` / `requests`                     |
| **Data Integration**    | Orchestrate CLI (dbt, Singer) | `subprocess` with config render       |
| **AI / LLM**            | API call with prompt        | Provider SDK (`openai`, `anthropic`, etc) |

## Proposed Generation Strategy

### Option A: Schema-driven codegen (recommended)

Pull plugin metadata from a running Kestra instance and generate stubs automatically.

```python
import requests
from textwrap import dedent

KESTRA_URL = "http://localhost:8080"

def fetch_plugin_schemas():
    """Pull full plugin catalog with JSON Schema inputs/outputs."""
    return requests.get(f"{KESTRA_URL}/api/v1/plugins").json()

def python_type(json_schema_type: str, format: str = None) -> str:
    mapping = {
        "string": "str",
        "integer": "int",
        "boolean": "bool",
        "number": "float",
        "array": "list",
        "object": "dict",
    }
    if format == "duration":
        return "timedelta"
    if format == "uri":
        return "str"
    return mapping.get(json_schema_type, "Any")

def generate_handler(plugin: dict) -> str:
    cls = plugin["type"]  # e.g. "io.kestra.plugin.aws.s3.Upload"
    module_path = cls.rsplit(".", 1)
    class_name = module_path[-1]
    fn_name = to_snake_case(class_name)

    inputs = plugin.get("properties", {})
    outputs = plugin.get("outputs", {})

    params = []
    for name, schema in inputs.items():
        py_type = python_type(schema.get("type", "string"), schema.get("format"))
        default = " = None" if not schema.get("required") else ""
        params.append(f"    {name}: {py_type}{default}")

    return_fields = []
    for name, schema in outputs.items():
        py_type = python_type(schema.get("type", "string"), schema.get("format"))
        return_fields.append(f'    "{name}": {py_type}')

    return dedent(f'''\
        def {fn_name}(
        {chr(10).join(params)}
        ) -> dict:
            """{cls}"""
            raise NotImplementedError("TODO: implement")
    ''')
```

### Option B: Static source parsing

Parse the Java source files directly using tree-sitter or regex to extract `Property<T>` fields and `@Schema` annotations. Useful when no Kestra instance is available.

Target files per plugin:
```
F:\kestra-io\plugins\plugin-{name}\src\main\java\io\kestra\plugin\{name}\*.java
```

Extract pattern:
```
@Schema(title = "...")
private Property<T> fieldName;
```

### Option C: Hybrid

Use the Kestra API for the catalog index, then enrich with source-parsed `@Example` YAML blocks for test fixtures and usage documentation.

## Output Structure

Generated handlers should land in:

```
services/
  handlers/
    aws/
      s3.py          # upload, download, list, delete, copy
      sqs.py         # publish, consume
    jdbc/
      postgres.py    # query, insert, batch
      mysql.py
    notifications/
      slack.py       # incoming_webhook
      pagerduty.py   # alert
    scripts/
      python.py      # exec_script
      shell.py
    ai/
      openai.py
      anthropic.py
```

Each handler file exports functions matching the Kestra task `run()` signature, accepting rendered (non-templated) Python values and returning plain dicts matching the Output schema.

## Example: S3 Upload

**Java source** (simplified):
```java
public class Upload extends AbstractS3Object implements RunnableTask<Upload.Output> {
    private Property<String> bucket;
    private Property<String> key;
    private Property<String> from;

    public Output run(RunContext runContext) { /* ... */ }

    public static class Output implements io.kestra.core.models.tasks.Output {
        private final String bucket;
        private final String key;
        private final String eTag;
    }
}
```

**Generated Python handler**:
```python
import boto3

def s3_upload(
    bucket: str,
    key: str,
    from_uri: str,
    region: str = "us-east-1",
    access_key_id: str | None = None,
    secret_access_key: str | None = None,
    session_token: str | None = None,
) -> dict:
    """io.kestra.plugin.aws.s3.Upload"""
    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        aws_session_token=session_token,
    )
    response = client.upload_file(from_uri, bucket, key)
    return {
        "bucket": bucket,
        "key": key,
        "eTag": response.get("ETag"),
    }
```

## Next Steps

1. Stand up a local Kestra instance and dump `GET /api/v1/plugins` to a JSON file
2. Build the codegen script (Option A) targeting the output structure above
3. Prioritize the plugin families by usage: Database and Cloud first, then Notifications
4. Wire generated handlers into the service registry

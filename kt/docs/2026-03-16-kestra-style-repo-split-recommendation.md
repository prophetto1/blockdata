# Kestra-Style Repo Split Recommendation for `kt`

Date: 2026-03-16
Author: Codex

## Recommendation

If the goal is to mirror Kestra's structure in a way that keeps future plugins cheap to add, the best split is `3` logical codebases, even if only `2` repos are created at first.

## Recommended Split

### Repo 1: runtime/core

This is the Kestra-main equivalent. It owns execution structure, not provider logic.

### Repo 2: plugins

This is the Kestra-io equivalent. It owns MongoDB, Postgres, GCS, and other provider integrations.

### Repo 3: host/platform

This owns FastAPI routes, connection lookup, auth, storage adapters, and deployment wiring.

## What Stays In `kt`

If `kt` becomes the runtime/core repo, keep only the things that every plugin family should depend on:

- `property.py`
- `task.py`
- `common.py`
- `run_context.py`
- `execution.py`, but split it up
- `registry.py`, but make it plugin-loader and registration oriented instead of Mongo-hardcoded

`kt` should then grow new runtime folders like:

- `blockdata/core/`
- `blockdata/worker/`
- `blockdata/executor/`
- `blockdata/scheduler/`
- `blockdata/plugins/` or `blockdata/plugin_sdk/`
- `tests/runtime/`

## What Goes Out To A Plugin Repo

Everything provider-specific should leave `kt`:

- `abstract_task.py`
- `abstract_load.py`
- `mongodb_connection.py`
- `mongodb_service.py`
- `find.py`
- `aggregate.py`
- `insert_one.py`
- `update.py`
- `delete.py`
- `load.py`
- `bulk.py`
- `trigger.py`
- `write_models.py`

That plugin repo should look more like:

- `blockdata_plugins/mongodb/...`
- later `blockdata_plugins/postgres/...`
- later `blockdata_plugins/gcs/...`

## What Should Probably Not Stay In Runtime Core

These are not really core runtime and are closer to the host/platform layer:

- `routes.py`
- `connection.py`

`routes.py` is webserver/host code.

`connection.py` is platform credential-resolution code.

## If You Want Only 2 Repos For Now

- `kt` becomes `blockdata-runtime`
- create `blockdata-plugins`
- keep `routes.py` and `connection.py` in `kt` temporarily under an `app/` or `host/` area

That is acceptable as an interim move.

## Concrete Folder Direction

Inside `kt`, the target shape should become something closer to:

```text
blockdata/
  core/
    models/
    runners/
    triggers/
    conditions/
  worker/
    task_invocation.py
    task_result.py
    task_callable.py
    trigger_invocation.py
    trigger_result.py
    trigger_callable.py
    runner.py
  executor/
    service.py
    state.py
  scheduler/
    trigger_service.py
    context.py
  plugin_sdk/
    registry.py
    loader.py
tests/
  runtime/
```

Inside the plugin repo:

```text
blockdata_plugins/
  mongodb/
    abstract_task.py
    abstract_load.py
    mongodb_connection.py
    mongodb_service.py
    find.py
    aggregate.py
    insert_one.py
    update.py
    delete.py
    load.py
    bulk.py
    trigger.py
```

## Bottom Line

`kt` should keep the reusable runtime substrate.

MongoDB should move out.

FastAPI and connection-resolution should ideally move out too, or at least be quarantined from the runtime core.

## Next Step

If this split looks right, the next useful follow-up is to map every current `kt/blockdata` file into one of three buckets:

- stay here
- move to plugins repo
- move to host repo

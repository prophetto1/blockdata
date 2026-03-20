# Docker Consolidation & SigNoz Observability Migration Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate Docker artifacts under `docker/` and migrate platform-api telemetry metadata/UI references from Jaeger to SigNoz.

**Architecture:**  
Platform-api still emits traces with OTLP HTTP to `http://localhost:4318` as before, but local observability infrastructure changes from OTel Collector + Jaeger to SigNoz + ClickHouse.

**Tech Stack:** Docker Compose, SigNoz `v0.116.1`, ClickHouse `25.5.6`, SigNoz OTel Collector `v0.144.2`, zookeeper `3.7.1`, FastAPI tests in platform-api.

---

## Execution constraints

1. All local validation and compose runs must be done in WSL2 or a Linux host. Native Windows execution for SigNoz standalone is not assumed.
2. Do not edit this plan while executing it. Complete code + validation first, then update plan if needed in a follow-up pass.

## Task 1: Vendor SigNoz ClickHouse config under versioned repo state

**Files:**
- Create: `docker/signoz/clickhouse/config.xml`
- Create: `docker/signoz/clickhouse/users.xml`
- Create: `docker/signoz/clickhouse/custom-function.xml`
- Create: `docker/signoz/clickhouse/cluster.xml`
- Create: `docker/signoz/clickhouse/user_scripts/.gitkeep`

### Step 1: Fetch files from pinned SigNoz tag

Run:

```bash
mkdir -p docker/signoz/clickhouse/user_scripts

BASE_URL="https://raw.githubusercontent.com/SigNoz/signoz/v0.116.1/deploy/common/clickhouse"
for file in config.xml users.xml custom-function.xml cluster.xml; do
  curl -fsSL "${BASE_URL}/${file}" -o "docker/signoz/clickhouse/${file}"
done

touch docker/signoz/clickhouse/user_scripts/.gitkeep
```

### Step 2: Verify

Run:

```bash
test -f docker/signoz/clickhouse/config.xml
test -f docker/signoz/clickhouse/users.xml
test -f docker/signoz/clickhouse/custom-function.xml
test -f docker/signoz/clickhouse/cluster.xml
test -d docker/signoz/clickhouse/user_scripts
```

Important:
- `init-clickhouse` in compose will fetch `histogramQuantile` at runtime; no pre-baked binary is required in this repo.
- This task is complete when the directory tree exists and files are pinned to `v0.116.1`.

### Step 3: Commit

```bash
git add docker/signoz/clickhouse/config.xml docker/signoz/clickhouse/users.xml docker/signoz/clickhouse/custom-function.xml docker/signoz/clickhouse/cluster.xml docker/signoz/clickhouse/user_scripts/.gitkeep
git commit -m "chore: vendor SigNoz ClickHouse config from v0.116.1"
```

---

## Task 2: Consolidate Docker artifacts into `docker/`

**Files:**
- Move: `services/docker-compose.docling.yml` -> `docker/docker-compose.docling.yml`
- Move: `services/platform-api/Dockerfile` -> `docker/platform-api/Dockerfile`
- Move: `services/opinions-import/Dockerfile` -> `docker/opinions-import/Dockerfile`
- Move: `services/uppy-companion/Dockerfile` -> `docker/uppy-companion/Dockerfile`
- Delete: `services/docker-compose.observability.yml`
- Delete: `services/observability/`
- Modify: `cloudbuild.yaml`

### Step 1: Create target directories

Run:

```bash
mkdir -p docker/platform-api docker/opinions-import docker/uppy-companion docker/signoz/clickhouse
```

### Step 2: Move files

Run:

```bash
git mv services/docker-compose.docling.yml docker/docker-compose.docling.yml
git mv services/platform-api/Dockerfile docker/platform-api/Dockerfile
git mv services/opinions-import/Dockerfile docker/opinions-import/Dockerfile
git mv services/uppy-companion/Dockerfile docker/uppy-companion/Dockerfile
git rm services/docker-compose.observability.yml
git rm -r services/observability
```

### Step 3: Update `cloudbuild.yaml`

Modify `cloudbuild.yaml`:

```diff
       - '-f'
-      - 'services/platform-api/Dockerfile'
+      - 'docker/platform-api/Dockerfile'
```

### Step 4: Verify

Run:

```bash
git status --short
```

Expected:
- Moved/deleted files match exactly the list above and `cloudbuild.yaml` changed as shown.

### Step 5: Commit

```bash
git add cloudbuild.yaml docker/
git commit -m "chore: consolidate Docker files into docker/"
```

---

## Task 3: Add SigNoz compose stack and collector config

**Files:**
- Create: `docker/docker-compose.signoz.yml`
- Create: `docker/signoz/otel-collector-config.yaml`
- Create: `docker/signoz/otel-collector-opamp-config.yaml`

### Step 1: Create OpAMP config

Create `docker/signoz/otel-collector-opamp-config.yaml`:

```yaml
server_endpoint: ws://signoz:4320/v1/opamp
```

### Step 2: Create collector config

Create `docker/signoz/otel-collector-config.yaml`:

```yaml
connectors:
  signozmeter:
    metrics_flush_interval: 1h
    dimensions:
      - name: service.name
      - name: deployment.environment
      - name: host.name

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  prometheus:
    config:
      global:
        scrape_interval: 60s
      scrape_configs:
        - job_name: otel-collector
          static_configs:
            - targets:
                - localhost:8888
              labels:
                job_name: otel-collector

processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s
  batch/meter:
    send_batch_max_size: 25000
    send_batch_size: 20000
    timeout: 1s
  signozspanmetrics/delta:
    metrics_exporter: signozclickhousemetrics
    metrics_flush_interval: 60s
    latency_histogram_buckets: [100us, 1ms, 2ms, 6ms, 10ms, 50ms, 100ms, 250ms, 500ms, 1000ms, 1400ms, 2000ms, 5s, 10s, 20s, 40s, 60s]
    dimensions_cache_size: 100000
    aggregation_temporality: AGGREGATION_TEMPORALITY_DELTA
    enable_exp_histogram: true
    dimensions:
      - name: service.namespace
        default: default
      - name: deployment.environment
        default: default
      - name: signoz.collector.id
      - name: service.version
      - name: host.name

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

exporters:
  clickhousetraces:
    datasource: tcp://clickhouse:9000/signoz_traces
    low_cardinal_exception_grouping: ${env:LOW_CARDINAL_EXCEPTION_GROUPING}
    use_new_schema: true
  signozclickhousemetrics:
    dsn: tcp://clickhouse:9000/signoz_metrics
  clickhouselogsexporter:
    dsn: tcp://clickhouse:9000/signoz_logs
    timeout: 10s
    use_new_schema: true
  signozclickhousemeter:
    dsn: tcp://clickhouse:9000/signoz_meter
    timeout: 45s
    sending_queue:
      enabled: false
  metadataexporter:
    cache:
      provider: in_memory
    dsn: tcp://clickhouse:9000/signoz_metadata
    enabled: true
    timeout: 45s

service:
  telemetry:
    logs:
      encoding: json
  extensions:
    - health_check
  pipelines:
    traces:
      receivers: [otlp]
      processors: [signozspanmetrics/delta, batch]
      exporters: [clickhousetraces, metadataexporter, signozmeter]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [signozclickhousemetrics, metadataexporter, signozmeter]
    metrics/prometheus:
      receivers: [prometheus]
      processors: [batch]
      exporters: [signozclickhousemetrics, metadataexporter, signozmeter]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouselogsexporter, metadataexporter, signozmeter]
    metrics/meter:
      receivers: [signozmeter]
      processors: [batch/meter]
      exporters: [signozclickhousemeter]
```

### Step 3: Create full compose file

Create `docker/docker-compose.signoz.yml`:

```yaml
version: "3"

x-common: &common
  networks:
    - signoz-net
  restart: unless-stopped
  logging:
    options:
      max-size: 50m
      max-file: "3"

services:
  init-clickhouse:
    <<: *common
    image: clickhouse/clickhouse-server:25.5.6
    container_name: signoz-init-clickhouse
    command:
      - bash
      - -c
      - |
        version="v0.0.1"
        node_os=$$(uname -s | tr '[:upper:]' '[:lower:]')
        node_arch=$$(uname -m | sed s/aarch64/arm64/ | sed s/x86_64/amd64/)
        echo "Fetching histogram-quantile for $${node_os}/$${node_arch}"
        cd /tmp
        wget -O histogram-quantile.tar.gz "https://github.com/SigNoz/signoz/releases/download/histogram-quantile%2F$${version}/histogram-quantile_$${node_os}_$${node_arch}.tar.gz"
        tar -xvzf histogram-quantile.tar.gz
        mv histogram-quantile /var/lib/clickhouse/user_scripts/histogramQuantile
    restart: on-failure
    volumes:
      - ./signoz/clickhouse/user_scripts:/var/lib/clickhouse/user_scripts/

  zookeeper:
    <<: *common
    image: signoz/zookeeper:3.7.1
    container_name: signoz-zookeeper
    user: root
    volumes:
      - signoz-zookeeper:/bitnami/zookeeper
    environment:
      - ZOO_SERVER_ID=1
      - ALLOW_ANONYMOUS_LOGIN=yes
      - ZOO_AUTOPURGE_INTERVAL=1
    healthcheck:
      test: ["CMD-SHELL", "curl -s -m 2 http://localhost:8080/commands/ruok | grep error | grep null"]
      interval: 30s
      timeout: 5s
      retries: 3

  clickhouse:
    <<: *common
    image: clickhouse/clickhouse-server:25.5.6
    container_name: signoz-clickhouse
    depends_on:
      init-clickhouse:
        condition: service_completed_successfully
      zookeeper:
        condition: service_healthy
    volumes:
      - ./signoz/clickhouse/config.xml:/etc/clickhouse-server/config.xml
      - ./signoz/clickhouse/users.xml:/etc/clickhouse-server/users.xml
      - ./signoz/clickhouse/custom-function.xml:/etc/clickhouse-server/custom-function.xml
      - ./signoz/clickhouse/user_scripts:/var/lib/clickhouse/user_scripts/
      - ./signoz/clickhouse/cluster.xml:/etc/clickhouse-server/config.d/cluster.xml
      - signoz-clickhouse:/var/lib/clickhouse/
    environment:
      - CLICKHOUSE_SKIP_USER_SETUP=1
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "0.0.0.0:8123/ping"]
      interval: 30s
      timeout: 5s
      retries: 3
    ulimits:
      nproc: 65535
      nofile:
        soft: 262144
        hard: 262144

  signoz-telemetrystore-migrator:
    <<: *common
    image: signoz/signoz-otel-collector:v0.144.2
    container_name: signoz-telemetrystore-migrator
    depends_on:
      clickhouse:
        condition: service_healthy
    environment:
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_DSN=tcp://clickhouse:9000
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_CLUSTER=cluster
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_REPLICATION=true
      - SIGNOZ_OTEL_COLLECTOR_TIMEOUT=10m
    entrypoint: ["/bin/sh"]
    command:
      - -c
      - |
        /signoz-otel-collector migrate bootstrap &&
        /signoz-otel-collector migrate sync up &&
        /signoz-otel-collector migrate async up
    restart: on-failure

  signoz:
    <<: *common
    image: signoz/signoz:v0.116.1
    container_name: signoz
    depends_on:
      clickhouse:
        condition: service_healthy
    ports:
      - "8080:8080"
    volumes:
      - signoz-sqlite:/var/lib/signoz/
    environment:
      - SIGNOZ_ALERTMANAGER_PROVIDER=signoz
      - SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://clickhouse:9000
      - SIGNOZ_SQLSTORE_SQLITE_PATH=/var/lib/signoz/signoz.db
      - SIGNOZ_TOKENIZER_JWT_SECRET=secret
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  otel-collector:
    <<: *common
    image: signoz/signoz-otel-collector:v0.144.2
    container_name: signoz-otel-collector
    depends_on:
      clickhouse:
        condition: service_healthy
    entrypoint: ["/bin/sh"]
    command:
      - -c
      - |
        /signoz-otel-collector migrate sync check &&
        /signoz-otel-collector --config=/etc/otel-collector-config.yaml --manager-config=/etc/manager-config.yaml --copy-path=/var/tmp/collector-config.yaml
    volumes:
      - ./signoz/otel-collector-config.yaml:/etc/otel-collector-config.yaml
      - ./signoz/otel-collector-opamp-config.yaml:/etc/manager-config.yaml
    environment:
      - OTEL_RESOURCE_ATTRIBUTES=host.name=signoz-host,os.type=linux
      - LOW_CARDINAL_EXCEPTION_GROUPING=false
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_DSN=tcp://clickhouse:9000
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_CLUSTER=cluster
      - SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_REPLICATION=true
      - SIGNOZ_OTEL_COLLECTOR_TIMEOUT=10m
    ports:
      - "4317:4317"
      - "4318:4318"

networks:
  signoz-net:
    name: signoz-net

volumes:
  signoz-clickhouse:
    name: signoz-clickhouse
  signoz-sqlite:
    name: signoz-sqlite
  signoz-zookeeper:
    name: signoz-zookeeper
```

### Step 4: Validate YAML loads

Run:

```bash
python - <<'PY'
import yaml, pathlib
for p in [
    pathlib.Path("docker/docker-compose.signoz.yml"),
    pathlib.Path("docker/signoz/otel-collector-config.yaml"),
    pathlib.Path("docker/signoz/otel-collector-opamp-config.yaml"),
]:
    yaml.safe_load(p.read_text(encoding="utf-8"))
    print(f"{p.name}: OK")
PY
```

### Step 5: Commit

```bash
git add docker/docker-compose.signoz.yml docker/signoz/otel-collector-config.yaml docker/signoz/otel-collector-opamp-config.yaml
git commit -m "feat: add SigNoz compose stack and collector configs"
```

---

## Task 4: Migrate telemetry status contract to SigNoz UI URL with explicit compatibility behavior

**Files:**
- Modify: `services/platform-api/app/core/config.py`
- Modify: `services/platform-api/app/observability/otel.py`
- Modify: `services/platform-api/tests/test_observability.py`
- Modify: `services/platform-api/start-dev.sh`

Behavior contract:
- Add `signoz_ui_url` and keep `jaeger_ui_url` as a deprecated compatibility alias for one pass.
- `/observability/telemetry-status` must return `signoz_ui_url` as first-class field.

### Step 1: Write failing test

Add/modify tests in `services/platform-api/tests/test_observability.py`:

```python
def test_telemetry_status_returns_signoz_ui_url_and_deprecated_alias():
    settings = _make_settings(otel_enabled=True, signoz_ui_url="http://localhost:8080", jaeger_ui_url="http://localhost:16686")
    status = get_telemetry_status(settings)
    assert status["signoz_ui_url"] == "http://localhost:8080"
    assert status["jaeger_ui_url"] == "http://localhost:16686"
```

### Step 2: Run failing test

Run:

```bash
pytest services/platform-api/tests/test_observability.py::test_telemetry_status_returns_signoz_ui_url_and_deprecated_alias -v
```

Expected: FAIL before implementation.

### Step 3: Update config defaults

Modify `services/platform-api/app/core/config.py`:
- Add `signoz_ui_url: str = "http://localhost:8080"` to `Settings`.
- Keep `jaeger_ui_url: str = "http://localhost:16686"` as deprecated alias with explicit comment.
- Read both env vars in `from_env()`.

### Step 4: Update telemetry payload builder

Modify `get_telemetry_status()` in `services/platform-api/app/observability/otel.py`:
- Add `"signoz_ui_url": settings.signoz_ui_url`.
- Keep `"jaeger_ui_url": settings.jaeger_ui_url` for migration compatibility.
- Update test expectations accordingly.

### Step 5: Update dev output

Modify `services/platform-api/start-dev.sh`:
- Print both fields:
  - `SIGNOZ_UI_URL` as canonical.
  - `JAEGER_UI_URL` flagged as deprecated.

### Step 6: Run full telemetry tests

Run:

```bash
pytest services/platform-api/tests/test_observability.py -q
```

Expected:
- New tests pass.
- Existing telemetry assertions pass with compatibility alias preserved.

### Step 7: Commit

```bash
git add services/platform-api/app/core/config.py services/platform-api/app/observability/otel.py services/platform-api/tests/test_observability.py services/platform-api/start-dev.sh
git commit -m "feat: migrate telemetry status contract to signoz_ui_url"
```

---

## Task 5: Validate end-to-end in Linux/WSL

**Files:**
- None (execution commands only)

### Step 1: Remove old observability stack

Run:

```bash
docker compose -f services/docker-compose.observability.yml down --remove-orphans
```

Expected: command exits cleanly whether file exists or not (`set +e` if scripting this step).

### Step 2: Start SigNoz stack

Run:

```bash
cd docker
docker compose -f docker-compose.signoz.yml up -d
```

### Step 3: Verify lifecycle-aware readiness

Run:

```bash
docker compose -f docker-compose.signoz.yml ps
```

Expected:
- `signoz-init-clickhouse`: `Exit 0`
- `signoz-telemetrystore-migrator`: `Exit 0`
- `clickhouse`, `signoz`, `otel-collector`, `zookeeper`: `running` or `healthy` depending on service

### Step 4: Verify telemetry signal path

```bash
cd ../services/platform-api
OTEL_ENABLED=true OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 uvicorn app.main:app --port 8000
curl http://localhost:8000/health
curl -H "Authorization: Bearer <M2M_TOKEN>" http://localhost:8000/observability/telemetry-status
```

Expected:
- SigNoz UI (`http://localhost:8080`) shows `platform-api` traces.
- `/observability/telemetry-status` includes `signoz_ui_url`.

---

Plan complete and saved to `docs/plans/2026-03-20-docker-consolidation-and-signoz.md`. Two execution options:

1. Subagent-Driven (this session) - dispatch a subagent per task and review after each task.
2. Parallel Session (separate) - open a new session to execute with `executing-plans`.

Which approach?

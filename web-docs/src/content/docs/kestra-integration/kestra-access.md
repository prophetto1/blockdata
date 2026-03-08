---
title: kestra-access
description: This file documents the working local Kestra stack so other workers can connect to it without guessing.
---

This file documents the working local Kestra stack so other workers can connect to it without guessing.

## Source Config

- Compose file: `/home/jon/docker/kestra/docker-compose.yml`
- Start directory: `/home/jon/docker/kestra`

## Services

- Kestra UI: `http://localhost:8088`
- Kestra management health: `http://localhost:8089/health`
- Postgres service name inside compose: `postgres`
- Postgres database: `kestra`

## Credentials

- Kestra username: `admin@kestra.io`
- Kestra password: `Kestra2026`
- Postgres username: `kestra`
- Postgres password: `k3str4`
- JDBC URL inside the Kestra container: `jdbc:postgresql://postgres:5432/kestra`

## Correct Way To Start

Use the compose stack. Do not launch the raw `kestra/kestra` or `postgres` images directly from Docker Desktop.

```bash
cd /home/jon/docker/kestra
docker compose up -d
docker compose ps
```

## Useful Commands

Check status:

```bash
cd /home/jon/docker/kestra
docker compose ps
```

Follow logs:

```bash
cd /home/jon/docker/kestra
docker compose logs -f kestra postgres
```

Open Postgres shell:

```bash
cd /home/jon/docker/kestra
docker compose exec -T postgres psql -U kestra -d kestra
```

List Kestra tables:

```bash
cd /home/jon/docker/kestra
docker compose exec -T postgres psql -U kestra -d kestra -c "\dt"
```

## Why Direct Container Launches Fail

- `postgres` fails if started without `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`
- `kestra` fails if started without the compose-provided command and `KESTRA_CONFIGURATION`
- the working stack depends on both services being started together

## Current Schema Exports

These files are already in:

`/home/jon/writing-system/docs-approved/backend setup/kestra-sqls`

Key files:

- `kestra_schema.sql`
- `kestra_table_definitions.sql`
- `tables.txt`
- `columns.tsv`
- `flows_definition.txt`
- `executions_definition.txt`

# GCP Status Report — agchain

**Date:** 2026-04-07

**Scope:** Full inventory of running/billable resources in GCP project `agchain` via `gcloud` CLI.

## Actions Taken

- Stopped VM `signoz-collector` (us-central1-a, e2-medium) — was RUNNING.
- Stopped VM `bd-bench-localai` (us-east1-b, e2-standard-2) — was RUNNING.
- Deleted Artifact Registry image `dagster-webserver` (all tags).

## Cloud Run

| Service | Region | Last Deployed |
|---|---|---|
| blockdata-platform-api | us-central1 | 2026-04-03 |

## Compute Engine VMs

| Name | Zone | Machine Type | Status |
|---|---|---|---|
| decompress-worker | us-central1-a | e2-standard-4 | TERMINATED |
| signoz-collector | us-central1-a | e2-medium | STOPPED (today) |
| bd-bench-localai | us-east1-b | e2-standard-2 | STOPPED (today) |

## Persistent Disks (attached to stopped VMs)

| Disk | Zone | Size | Type |
|---|---|---|---|
| decompress-worker | us-central1-a | 50 GB | pd-standard |
| signoz-collector | us-central1-a | 30 GB | pd-balanced |
| bd-bench-localai | us-east1-b | 100 GB | pd-standard |

## Cloud Storage Buckets

| Bucket | Location | Size |
|---|---|---|
| agchain-case-law | us-central1 | 371 GB |
| agchain_cloudbuild | US | 785 MB |
| blockdata-user-content-dev | us-central1 | 8 MB |
| blockdata-user-content-prod | us-central1 | 0 (empty) |
| run-sources-agchain-us-central1 | us-central1 | 340 MB |

## Artifact Registry

| Repo | Format | Size (pre-cleanup) |
|---|---|---|
| cloud-run-source-deploy | Docker | ~464 GB |

Remaining images after dagster deletion:
- blockdata-platform-api (two path variants)
- writing-system-conversion-service

## Secret Manager

- app-secret-envelope-key
- conversion-service-key
- platform-api-m2m-token
- supabase-service-role-key

## Pub/Sub

4 auto-managed `container-analysis` topics. No custom subscriptions.

## Not Present

- Cloud SQL: none
- Redis/Memorystore: none
- GKE clusters: none
- VPC Access connectors: none
- Cloud DNS zones: none
- Cloud Functions: none

## Notes

- `agchain_cloudbuild` and `run-sources-agchain-us-central1` are auto-created by Cloud Build / Cloud Run.
- Artifact Registry has accumulated many old image versions of `blockdata-platform-api` — candidate for pruning.
- 3 persistent disks still billing despite all VMs being stopped.

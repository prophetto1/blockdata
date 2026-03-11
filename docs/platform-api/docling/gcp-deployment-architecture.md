## GCP Deployment Architecture for Docling

Based on your existing services and Docling's serving patterns, here's the recommended setup:

### Recommended: Cloud Run + GPU (Simplest Path)

```
┌─────────────────────────────────────────────────┐
│  Cloud Run                                       │
│                                                  │
│  ┌──────────────────────┐  ┌──────────────────┐ │
│  │ conversion-service   │  │ pipeline-worker   │ │
│  │ (CPU, scales 0→N)    │  │ (CPU, scales 0→N) │ │
│  └──────────┬───────────┘  └────────┬─────────┘ │
│             │                       │            │
│  ┌──────────▼───────────────────────▼─────────┐ │
│  │ docling-serve (GPU L4, min 1, scales 1→4)  │ │
│  │ Port 5001 — REST API                       │ │
│  │ Models: layout + TableFormer + OCR          │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐         ┌────▼────┐
    │Supabase │         │ GCS     │
    │(existing)│         │ Bucket  │
    └─────────┘         └─────────┘
```

**Why Cloud Run over GKE:**
- Your services are already Dockerized — zero config change
- Cloud Run now supports GPUs (L4) in `us-central1`, `europe-west4`, `asia-northeast1`
- Scales to zero on CPU services (cost savings)
- No cluster management, no node pools, no k8s YAML
- Simpler than KServe/Triton for your scale
- Existing PowerShell deploy scripts (`scripts/deploy-cloud-run-*.ps1`) already handle service accounts, Artifact Registry, Secret Manager, and IAM — extend these rather than starting from scratch

### Service Breakdown

| Service | Runtime | GPU | Min Instances | Notes |
|---------|---------|-----|---------------|-------|
| `docling-serve` | Cloud Run | L4 (24GB VRAM) | 1 | Use `quay.io/ds4sd/docling-serve-cpu` as base, swap to GPU variant. Holds layout + table + OCR models in VRAM |
| `conversion-service` | Cloud Run | None | 0 | Existing FastAPI service (port 8000, `python:3.11-slim`). Currently imports docling directly — refactor to call docling-serve via internal URL. Already deployed with `2 CPU, 4Gi, concurrency 1` per existing deploy script |
| `pipeline-worker` | Cloud Run | None | 0 | Existing FastAPI plugin executor (port 8000, `python:3.11-slim`). No changes needed |
| `uppy-companion` | Cloud Run | None | 1 | Existing Express/Node 20 OAuth file proxy (port 3020). Already deployed with `1 CPU, 512Mi, concurrency 80` per existing deploy script |

### Key Architecture Decisions

**1. Decouple docling from conversion-service**

Right now `conversion-service` (`services/conversion-service/app/main.py`) imports docling directly via `from docling.document_converter import DocumentConverter` and builds a local converter in `_build_docling_converter()`. The Dockerfile pre-downloads all models at build time and bakes RapidOCR assets into the image. For cloud, split it:
- `docling-serve` runs as a standalone service with GPU
- `conversion-service` calls docling-serve's REST API (`POST /v1alpha/convert/source`)
- This lets you scale GPU independently from CPU work (pandoc, mdast transforms)

**2. docling-serve handles model loading**

docling-serve loads models once at startup and keeps them in VRAM. The REST API accepts the same pipeline options your UI generates — you pass the `parsing_profiles` JSON config directly. All pipeline option classes inherit from Pydantic v2 `BaseModel` (see `docling/datamodel/pipeline_options.py`), so `model_validate()` / `model_dump()` provide full JSON round-tripping.

```python
# conversion-service calls docling-serve
response = httpx.post(
    f"{DOCLING_SERVE_URL}/v1alpha/convert/source",
    json={
        "source": file_url_or_base64,
        "options": parsing_profile_config  # from Supabase
    }
)
```

**3. Min 1 instance for GPU service**

GPU cold starts are 30-60s (model loading). Keep at least 1 warm instance. Cost: ~$0.70/hr for L4 on Cloud Run ≈ $500/month for always-on.

### Deployment Steps

```bash
# 1. Enable Cloud Run GPU (one-time)
gcloud beta run deploy docling-serve \
  --image quay.io/ds4sd/docling-serve-cpu:latest \
  --gpu 1 --gpu-type nvidia-l4 \
  --cpu 8 --memory 32Gi \
  --min-instances 1 --max-instances 4 \
  --port 5001 \
  --region us-central1 \
  --no-allow-unauthenticated

# 2. Deploy conversion-service (existing Dockerfile)
gcloud run deploy conversion-service \
  --source services/conversion-service/ \
  --cpu 2 --memory 4Gi \
  --min-instances 0 --max-instances 10 \
  --set-env-vars DOCLING_SERVE_URL=<internal-url> \
  --region us-central1

# 3. Deploy pipeline-worker
gcloud run deploy pipeline-worker \
  --source services/pipeline-worker/ \
  --cpu 2 --memory 2Gi \
  --min-instances 0 --max-instances 10 \
  --region us-central1
```

### Cost Estimate (Monthly)

| Component | Config | Est. Cost |
|-----------|--------|-----------|
| docling-serve (GPU) | 1× L4, 8 vCPU, 32GB, always-on | ~$500 |
| conversion-service | 0→10, 2 vCPU, 4GB, scales to zero | ~$20-80 |
| pipeline-worker | 0→10, 2 vCPU, 2GB, scales to zero | ~$10-40 |
| GCS storage | Document staging | ~$5 |
| **Total** | | **~$535-625/mo** |

### Alternative: CPU-Only (Cheaper, Slower)

If GPU cost is too high initially, docling works on CPU — just slower (~10-30s per page vs ~1-3s with GPU). Use `docling-serve-cpu` image without GPU flag. You can start CPU-only and add GPU later with zero code changes.

```bash
gcloud run deploy docling-serve \
  --image quay.io/ds4sd/docling-serve-cpu:latest \
  --cpu 8 --memory 16Gi \
  --min-instances 1 --max-instances 8 \
  --concurrency 1 \
  --port 5001 \
  --region us-central1
```

Cost drops to ~$150-200/mo but processing is 10× slower.

### What Needs to Change in Your Code

1. **`conversion-service`** — Replace direct `docling` import (`_build_docling_converter()` and `converter.convert()` calls in `app/main.py`) with HTTP calls to docling-serve. The `docling` track handler (lines ~298-314) becomes an `httpx.post()` to the internal docling-serve URL. Pandoc and mdast tracks stay unchanged.
2. **`parsing_profiles` config** — Add a thin mapping layer to translate UI field names to docling-serve's expected format (the Pydantic validation gap identified earlier — field name mismatches for layout model names, OCR engine `kind` values, and per-engine language formats).
3. **Extend existing deploy scripts** — `scripts/deploy-cloud-run-conversion-service.ps1` and `scripts/deploy-cloud-run-uppy-companion.ps1` already handle service accounts, Artifact Registry, Secret Manager, and IAM. Add a `deploy-cloud-run-docling-serve.ps1` following the same pattern, and a `deploy-cloud-run-pipeline-worker.ps1`.

### Note on KServe/Triton

Docling has KServe v2 client support (`docling/models/inference_engines/common/kserve_v2_*.py`) for offloading *individual model inference* (layout detection, image classification) to a remote Triton server. This is NOT an alternative to docling-serve — it's a way to serve specific ML models remotely while docling orchestrates the full pipeline. Relevant if you later need to share GPU resources across multiple docling-serve instances, but not needed for initial deployment.

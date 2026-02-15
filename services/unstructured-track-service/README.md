# unstructured-track-service

Track B execution service scaffold for Unstructured OSS pipeline work.

## Runtime

- Python `3.12.x` (pinned by `pyproject.toml` and `Dockerfile`)

## Current scope

- Health endpoint (`GET /health`)
- Unstructured-style general partition endpoint (`POST /general/v0/general`)
- Version alias route (`POST /general/v1/general`)
- Internal worker partition endpoint (`POST /partition`)
- Versioned raw-type -> platform block-type taxonomy mapping module

`/general/v0/general` currently supports:
- Multipart file upload (`files`)
- Form flags: `coordinates`, `strategy`, `output_format`, `unique_element_ids`, `chunking_strategy`
- API key header behavior via `UNSTRUCTURED_API_KEY` + `unstructured-api-key`
- Multi-file `Accept` conflict handling (`406` for unsupported media types)
- `Accept: multipart/mixed` response mode for partition results
- GET on `/general/v0/general` and `/general/v1/general` returns `405` with
  `"Only POST requests are supported."`
- Response header `X-Track-B-Partition-Backend` indicates backend path (`sdk`,
  `local`, or `mock`; comma-separated for multi-file requests)
- Adapter execution mode via `TRACK_B_PARTITION_MODE`:
  - `auto` (default): try SDK (when `UNSTRUCTURED_API_URL` is set), then local, then mock
  - `sdk`: force `unstructured-client` path
  - `local`: force local `unstructured.partition.auto` path
  - `mock`: force deterministic mock payloads

## Environment

- `UNSTRUCTURED_API_URL`: hosted/self-host Unstructured API base URL (used in `sdk` mode and `auto` mode preference)
- `UNSTRUCTURED_API_KEY`: API key for hosted partition endpoint auth
- `TRACK_B_PARTITION_MODE`: `auto|sdk|local|mock`

## `/partition` contract (current)

Request JSON:

```json
{
  "source_uid": "<sha256-hex>",
  "source_type": "pdf",
  "source_locator": "uploads/doc.pdf",
  "doc_title": "Sample Title",
  "partition_parameters": {
    "coordinates": true,
    "strategy": "auto",
    "output_format": "application/json",
    "unique_element_ids": false,
    "chunking_strategy": "by_title"
  }
}
```

Response JSON:

```json
{
  "elements": [
    {
      "type": "Title",
      "element_id": "0123abcd...",
      "text": "Sample Title",
      "metadata": {
        "page_number": 1,
        "coordinates": {
          "points": [[20, 20], [580, 20], [580, 60], [20, 60]],
          "system": "PixelSpace",
          "layout_width": 1200,
          "layout_height": 1600
        }
      }
    }
  ],
  "mapping_version": "2026-02-14"
}
```

## Local run

```bash
uvicorn app.main:app --reload --port 8000
```

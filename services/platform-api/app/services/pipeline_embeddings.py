from __future__ import annotations

from dataclasses import dataclass
import random
import time
from typing import Callable, Sequence

import httpx
import numpy as np

from app.infra.crypto import decrypt_with_fallback
from app.infra.supabase_client import get_supabase_admin

USER_API_KEYS_CONTEXT = "user-api-keys-v1"
_MAX_BATCH_CHUNKS = 64
_MAX_BATCH_UTF8_BYTES = 250000
_MAX_ATTEMPTS = 5
_MAX_BACKOFF_SECONDS = 16.0


@dataclass(frozen=True)
class EmbeddingSelection:
    provider: str
    model_id: str
    dimensions: int | None
    api_key: str
    base_url: str | None


class TransientEmbeddingError(RuntimeError):
    pass


def resolve_embedding_selection(*, owner_id: str) -> EmbeddingSelection:
    admin = get_supabase_admin()
    candidates = (
        admin.table("model_role_assignments")
        .select("provider, model_id, priority, config_jsonb, is_active")
        .eq("role_key", "embedding")
        .eq("is_active", True)
        .order("priority", desc=False)
        .execute()
        .data
        or []
    )

    for candidate in candidates:
        provider = str(candidate.get("provider") or "").strip()
        if not provider:
            continue

        credential = _load_api_key_credential(admin=admin, owner_id=owner_id, provider=provider)
        if credential is None:
            continue

        if provider not in {"openai", "voyage"}:
            raise RuntimeError(f"Embedding provider '{provider}' is not supported by platform-api")

        config = candidate.get("config_jsonb") or {}
        dimensions = config.get("dimensions")
        return EmbeddingSelection(
            provider=provider,
            model_id=str(candidate["model_id"]),
            dimensions=int(dimensions) if isinstance(dimensions, int | float) else None,
            api_key=credential["api_key"],
            base_url=credential.get("base_url"),
        )

    raise RuntimeError("No usable embedding credential configured")


def embed_pipeline_chunks(
    *,
    chunks: Sequence[object],
    selection: EmbeddingSelection,
    heartbeat: Callable[[], None] | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
    jitter_fn: Callable[[], float] = random.random,
    client_factory: Callable[..., httpx.Client] = httpx.Client,
) -> np.ndarray:
    if not chunks:
        width = selection.dimensions or 0
        return np.zeros((0, width), dtype=np.float32)

    vectors: list[list[float]] = []
    for batch_texts in _batch_chunk_texts(chunks):
        batch_vectors = _embed_batch_with_retry(
            texts=batch_texts,
            selection=selection,
            sleep_fn=sleep_fn,
            jitter_fn=jitter_fn,
            client_factory=client_factory,
        )
        vectors.extend(batch_vectors)
        if heartbeat is not None:
            heartbeat()

    array = np.asarray(vectors, dtype=np.float32)
    if array.ndim != 2:
        raise RuntimeError("Malformed embedding response shape")
    if selection.dimensions is not None and array.shape[1] != selection.dimensions:
        raise RuntimeError(
            f"Embedding dimensions mismatch: expected {selection.dimensions}, received {array.shape[1]}"
        )
    return array


def _load_api_key_credential(*, admin, owner_id: str, provider: str) -> dict[str, str] | None:
    row = (
        admin.table("user_api_keys")
        .select("api_key_encrypted, is_valid, base_url")
        .eq("user_id", owner_id)
        .eq("provider", provider)
        .limit(1)
        .execute()
        .data
        or []
    )
    item = row[0] if row else None
    if not item or not item.get("api_key_encrypted"):
        return None
    if item.get("is_valid") is False:
        return None

    return {
        "api_key": decrypt_with_fallback(str(item["api_key_encrypted"]), USER_API_KEYS_CONTEXT),
        "base_url": str(item["base_url"]).strip() if item.get("base_url") else None,
    }


def _batch_chunk_texts(chunks: Sequence[object]) -> list[list[str]]:
    batches: list[list[str]] = []
    current: list[str] = []
    current_bytes = 0

    for chunk in chunks:
        text = str(getattr(chunk, "text"))
        text_bytes = len(text.encode("utf-8"))
        if current and (len(current) >= _MAX_BATCH_CHUNKS or current_bytes + text_bytes > _MAX_BATCH_UTF8_BYTES):
            batches.append(current)
            current = []
            current_bytes = 0
        current.append(text)
        current_bytes += text_bytes

    if current:
        batches.append(current)
    return batches


def _embed_batch_with_retry(
    *,
    texts: list[str],
    selection: EmbeddingSelection,
    sleep_fn: Callable[[float], None],
    jitter_fn: Callable[[], float],
    client_factory: Callable[..., httpx.Client],
) -> list[list[float]]:
    attempt = 0
    while True:
        attempt += 1
        try:
            return _request_embedding_batch(texts=texts, selection=selection, client_factory=client_factory)
        except TransientEmbeddingError:
            if attempt >= _MAX_ATTEMPTS:
                raise
            backoff_seconds = min(2 ** (attempt - 1), _MAX_BACKOFF_SECONDS) + (jitter_fn() * 0.25)
            sleep_fn(backoff_seconds)


def _request_embedding_batch(
    *,
    texts: list[str],
    selection: EmbeddingSelection,
    client_factory: Callable[..., httpx.Client],
) -> list[list[float]]:
    url = _resolve_embeddings_url(selection)
    headers = {"Authorization": f"Bearer {selection.api_key}"}
    payload = _build_request_payload(selection, texts)

    try:
        with client_factory(timeout=60.0) as client:
            response = client.post(url, headers=headers, json=payload)
    except httpx.HTTPError as exc:
        raise TransientEmbeddingError(f"Embedding request failed: {type(exc).__name__}") from exc

    status_code = response.status_code
    if status_code in {408, 429} or status_code >= 500:
        raise TransientEmbeddingError(f"Embedding request failed with status {status_code}")
    if status_code in {400, 401, 403}:
        raise RuntimeError(f"Embedding provider rejected request with status {status_code}")
    if status_code >= 400:
        raise RuntimeError(f"Unsupported embedding provider response status {status_code}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError("Embedding provider returned malformed JSON") from exc

    vectors = _extract_embedding_vectors(payload)
    if len(vectors) != len(texts):
        raise RuntimeError("Embedding provider returned an unexpected vector count")
    return vectors


def _resolve_embeddings_url(selection: EmbeddingSelection) -> str:
    if selection.provider == "openai":
        base_url = selection.base_url or "https://api.openai.com/v1"
    elif selection.provider == "voyage":
        base_url = selection.base_url or "https://api.voyageai.com/v1"
    else:
        raise RuntimeError(f"Unsupported embedding provider '{selection.provider}'")
    return f"{base_url.rstrip('/')}/embeddings"


def _build_request_payload(selection: EmbeddingSelection, texts: list[str]) -> dict[str, object]:
    if selection.provider == "openai":
        payload: dict[str, object] = {
            "model": selection.model_id,
            "input": texts,
            "encoding_format": "float",
        }
        if selection.dimensions is not None:
            payload["dimensions"] = selection.dimensions
        return payload

    if selection.provider == "voyage":
        return {
            "model": selection.model_id,
            "input": texts,
            "input_type": "document",
        }

    raise RuntimeError(f"Unsupported embedding provider '{selection.provider}'")


def _extract_embedding_vectors(payload: object) -> list[list[float]]:
    if not isinstance(payload, dict):
        raise RuntimeError("Embedding provider returned malformed payload")

    data = payload.get("data")
    if isinstance(data, list):
        vectors = []
        for item in data:
            if not isinstance(item, dict) or not isinstance(item.get("embedding"), list):
                raise RuntimeError("Embedding provider returned malformed vector rows")
            vectors.append([float(value) for value in item["embedding"]])
        return vectors

    embeddings = payload.get("embeddings")
    if isinstance(embeddings, list):
        vectors = []
        for item in embeddings:
            if isinstance(item, dict):
                vector = item.get("embedding")
            else:
                vector = item
            if not isinstance(vector, list):
                raise RuntimeError("Embedding provider returned malformed embeddings list")
            vectors.append([float(value) for value in vector])
        return vectors

    raise RuntimeError("Embedding provider returned malformed response")

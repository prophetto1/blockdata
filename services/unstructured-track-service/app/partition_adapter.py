from __future__ import annotations

from dataclasses import fields
import os
from pathlib import Path
import tempfile
from typing import Any

from .partition import build_partition_elements

_FALLBACK_PARTITION_FIELDS = {
    "chunking_strategy",
    "coordinates",
    "output_format",
    "strategy",
    "unique_element_ids",
}


class PartitionAdapterError(RuntimeError):
    pass


def get_sdk_partition_parameter_fields() -> set[str]:
    try:
        from unstructured_client.models.shared import PartitionParameters
    except Exception:
        return set(_FALLBACK_PARTITION_FIELDS)

    try:
        model_fields = getattr(PartitionParameters, "model_fields")
        if isinstance(model_fields, dict):
            return set(model_fields.keys())
    except Exception:
        pass

    try:
        return {f.name for f in fields(PartitionParameters)}
    except Exception:
        return set(_FALLBACK_PARTITION_FIELDS)


def filter_partition_parameters(partition_parameters: dict[str, Any]) -> dict[str, Any]:
    supported = get_sdk_partition_parameter_fields()
    return {
        key: value
        for key, value in partition_parameters.items()
        if key in supported and value is not None
    }


def partition_with_sdk(
    *,
    filename: str,
    content: bytes,
    partition_parameters: dict[str, Any],
    server_url: str | None,
    api_key: str | None,
) -> list[dict[str, Any]]:
    try:
        from unstructured_client import UnstructuredClient
        from unstructured_client.models.operations import PartitionRequest
        from unstructured_client.models.shared import Files, PartitionParameters
    except Exception as exc:
        raise PartitionAdapterError(
            "unstructured-client is not available for SDK partition mode"
        ) from exc

    filtered = filter_partition_parameters(partition_parameters)
    filtered["files"] = Files(content=content, file_name=filename)
    partition_request = PartitionRequest(
        partition_parameters=PartitionParameters(**filtered)
    )
    client = UnstructuredClient(server_url=server_url, api_key_auth=api_key)
    response = client.general.partition(request=partition_request)
    return response.elements or []


def partition_with_local_unstructured(
    *,
    filename: str,
    content: bytes,
    partition_parameters: dict[str, Any],
) -> list[dict[str, Any]]:
    try:
        from unstructured.partition.auto import partition
        from unstructured.staging.base import elements_to_dicts
    except Exception as exc:
        raise PartitionAdapterError(
            "unstructured local partition dependencies are not available"
        ) from exc

    suffix = Path(filename).suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        kwargs: dict[str, Any] = {"filename": str(tmp_path)}
        for key in ["coordinates", "strategy", "chunking_strategy", "unique_element_ids"]:
            if key in partition_parameters and partition_parameters[key] is not None:
                kwargs[key] = partition_parameters[key]
        elements = partition(**kwargs)
        return elements_to_dicts(elements)
    except Exception as exc:
        raise PartitionAdapterError("local partition execution failed") from exc
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


def partition_document_bytes(
    *,
    filename: str,
    content: bytes,
    source_uid: str,
    source_type: str,
    source_locator: str | None,
    doc_title: str | None,
    partition_parameters: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    mode = (os.environ.get("TRACK_B_PARTITION_MODE") or "auto").strip().lower()
    server_url = (os.environ.get("UNSTRUCTURED_API_URL") or "").strip() or None
    api_key = (os.environ.get("UNSTRUCTURED_API_KEY") or "").strip() or None

    def mock_elements() -> list[dict[str, Any]]:
        return build_partition_elements(
            source_uid=source_uid,
            source_type=source_type,
            source_locator=source_locator,
            doc_title=doc_title,
            include_coordinates=bool(partition_parameters.get("coordinates")),
            unique_element_ids=bool(partition_parameters.get("unique_element_ids")),
        )

    if mode == "mock":
        return mock_elements(), "mock"
    if mode == "sdk":
        return (
            partition_with_sdk(
                filename=filename,
                content=content,
                partition_parameters=partition_parameters,
                server_url=server_url,
                api_key=api_key,
            ),
            "sdk",
        )
    if mode == "local":
        return (
            partition_with_local_unstructured(
                filename=filename,
                content=content,
                partition_parameters=partition_parameters,
            ),
            "local",
        )

    if server_url:
        try:
            return (
                partition_with_sdk(
                    filename=filename,
                    content=content,
                    partition_parameters=partition_parameters,
                    server_url=server_url,
                    api_key=api_key,
                ),
                "sdk",
            )
        except PartitionAdapterError:
            pass

    try:
        return (
            partition_with_local_unstructured(
                filename=filename,
                content=content,
                partition_parameters=partition_parameters,
            ),
            "local",
        )
    except PartitionAdapterError:
        return mock_elements(), "mock"

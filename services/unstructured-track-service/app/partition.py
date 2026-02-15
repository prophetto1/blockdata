from __future__ import annotations

import hashlib
import uuid
from typing import Any


def _element_id(
    *,
    source_uid: str,
    ordinal: int,
    raw_type: str,
    text: str,
    unique_element_ids: bool,
) -> str:
    if unique_element_ids:
        return str(uuid.uuid4())
    digest = hashlib.sha256(
        f"{source_uid}:{ordinal}:{raw_type}:{text}".encode("utf-8")
    ).hexdigest()
    return digest[:32]


def _metadata(
    *,
    source_uid: str,
    source_type: str,
    source_locator: str | None,
    include_coordinates: bool,
    ordinal: int,
) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "producer": "unstructured_track_service_mock_v2",
        "source_uid": source_uid,
        "source_type": source_type,
        "source_locator": source_locator,
        "page_number": 1,
    }
    if include_coordinates:
        x0 = 20 + (ordinal * 10)
        metadata["coordinates"] = {
            "points": [
                [x0, 20],
                [x0 + 560, 20],
                [x0 + 560, 60],
                [x0, 60],
            ],
            "system": "PixelSpace",
            "layout_width": 1200,
            "layout_height": 1600,
        }
    return metadata


def build_partition_elements(
    source_uid: str,
    source_type: str,
    doc_title: str | None,
    source_locator: str | None,
    include_coordinates: bool,
    unique_element_ids: bool,
) -> list[dict[str, Any]]:
    elements: list[dict[str, Any]] = []
    title = (doc_title or "").strip()
    if title:
        ordinal = len(elements)
        elements.append(
            {
                "type": "Title",
                "text": title,
                "element_id": _element_id(
                    source_uid=source_uid,
                    ordinal=ordinal,
                    raw_type="Title",
                    text=title,
                    unique_element_ids=unique_element_ids,
                ),
                "metadata": _metadata(
                    source_uid=source_uid,
                    source_type=source_type,
                    source_locator=source_locator,
                    include_coordinates=include_coordinates,
                    ordinal=ordinal,
                ),
            }
        )

    paragraph_text = (
        f"{title}\n\nMock partition output."
        if title
        else f"Mock partition output for {source_uid[:12]}."
    )
    ordinal = len(elements)
    elements.append(
        {
            "type": "NarrativeText",
            "text": paragraph_text,
            "element_id": _element_id(
                source_uid=source_uid,
                ordinal=ordinal,
                raw_type="NarrativeText",
                text=paragraph_text,
                unique_element_ids=unique_element_ids,
            ),
            "metadata": _metadata(
                source_uid=source_uid,
                source_type=source_type,
                source_locator=source_locator,
                include_coordinates=include_coordinates,
                ordinal=ordinal,
            ),
        }
    )
    return elements

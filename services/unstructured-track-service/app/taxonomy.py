from __future__ import annotations

TAXONOMY_MAPPING_VERSION = "2026-02-14"

_RAW_TO_PLATFORM_BLOCK_TYPE: dict[str, str] = {
    "Title": "heading",
    "NarrativeText": "paragraph",
    "Text": "paragraph",
    "ListItem": "list_item",
    "Table": "table",
    "Image": "figure",
    "FigureCaption": "caption",
    "Header": "page_header",
    "Footer": "page_footer",
}


def map_raw_element_type(raw_element_type: str | None) -> str:
    if not raw_element_type:
        return "other"
    return _RAW_TO_PLATFORM_BLOCK_TYPE.get(raw_element_type, "other")

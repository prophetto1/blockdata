from __future__ import annotations

from uuid import uuid4


def _load_owned_sources(admin, owner_id: str, project_id: str, source_uids: list[str]) -> list[dict]:
    rows = (
        admin.table("source_documents")
        .select("source_uid, project_id, doc_title, source_type, source_filesize, source_locator")
        .eq("owner_id", owner_id)
        .eq("project_id", project_id)
        .in_("source_uid", source_uids)
        .execute()
        .data
        or []
    )
    order = {source_uid: index for index, source_uid in enumerate(source_uids)}
    return sorted(rows, key=lambda row: order.get(row["source_uid"], 0))


def _load_source_set_row(admin, owner_id: str, pipeline_kind: str, source_set_id: str) -> dict | None:
    return (
        admin.table("pipeline_source_sets")
        .select("*")
        .eq("owner_id", owner_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("source_set_id", source_set_id)
        .maybe_single()
        .execute()
        .data
    )


def _load_source_set_items(admin, source_set_id: str) -> list[dict]:
    return (
        admin.table("pipeline_source_set_items")
        .select("source_uid, source_order, doc_title, source_type, byte_size, object_key")
        .eq("source_set_id", source_set_id)
        .order("source_order", desc=False)
        .execute()
        .data
        or []
    )


def _load_latest_job_summary(admin, owner_id: str, pipeline_kind: str, source_set_id: str) -> dict | None:
    row = (
        admin.table("pipeline_jobs")
        .select("job_id, pipeline_kind, source_set_id, status, stage")
        .eq("owner_id", owner_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("source_set_id", source_set_id)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        return None
    return {
        "job_id": row["job_id"],
        "pipeline_kind": row["pipeline_kind"],
        "source_set_id": row["source_set_id"],
        "status": row["status"],
        "stage": row["stage"],
    }


def _serialize_source_set(row: dict, items: list[dict], latest_job: dict | None) -> dict:
    total_bytes = row.get("total_bytes")
    if total_bytes is None:
        total_bytes = sum(int(item.get("byte_size") or 0) for item in items)
    return {
        "source_set_id": row["source_set_id"],
        "project_id": row["project_id"],
        "label": row["label"],
        "member_count": row.get("member_count") or len(items),
        "total_bytes": total_bytes,
        "updated_at": row.get("updated_at"),
        "items": [
            {
                "source_uid": item["source_uid"],
                "doc_title": item["doc_title"],
                "source_type": item["source_type"],
                "byte_size": item.get("byte_size"),
                "source_order": item["source_order"],
                "object_key": item.get("object_key"),
            }
            for item in items
        ],
        "latest_job": latest_job,
    }


def list_source_sets(admin, *, owner_id: str, pipeline_kind: str, project_id: str) -> list[dict]:
    rows = (
        admin.table("pipeline_source_sets")
        .select("source_set_id, project_id, label, member_count, total_bytes, updated_at")
        .eq("owner_id", owner_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    items = []
    for row in rows:
        items.append(
            {
                "source_set_id": row["source_set_id"],
                "project_id": row["project_id"],
                "label": row["label"],
                "member_count": row.get("member_count") or 0,
                "total_bytes": row.get("total_bytes") or 0,
                "updated_at": row.get("updated_at"),
                "latest_job": _load_latest_job_summary(admin, owner_id, pipeline_kind, row["source_set_id"]),
            }
        )
    return items


def get_source_set_detail(admin, *, owner_id: str, pipeline_kind: str, source_set_id: str) -> dict | None:
    row = _load_source_set_row(admin, owner_id, pipeline_kind, source_set_id)
    if not row:
        return None
    items = _load_source_set_items(admin, source_set_id)
    latest_job = _load_latest_job_summary(admin, owner_id, pipeline_kind, source_set_id)
    return _serialize_source_set(row, items, latest_job)


def create_source_set(
    admin,
    *,
    owner_id: str,
    pipeline_kind: str,
    project_id: str,
    label: str,
    source_uids: list[str],
    eligible_source_types: list[str],
) -> dict:
    if not source_uids:
        raise ValueError("At least one markdown source must be selected")
    sources = _load_owned_sources(admin, owner_id, project_id, source_uids)
    if len(sources) != len(source_uids):
        raise ValueError("One or more sources were not found")
    if any(source["source_type"] not in eligible_source_types for source in sources):
        raise ValueError("One or more sources are not eligible for this pipeline")

    source_set_id = str(uuid4())
    total_bytes = sum(int(source.get("source_filesize") or 0) for source in sources)
    admin.table("pipeline_source_sets").insert(
        {
            "source_set_id": source_set_id,
            "pipeline_kind": pipeline_kind,
            "owner_id": owner_id,
            "project_id": project_id,
            "label": label,
            "member_count": len(sources),
            "total_bytes": total_bytes,
        }
    ).execute()
    admin.table("pipeline_source_set_items").insert(
        [
            {
                "source_set_id": source_set_id,
                "owner_id": owner_id,
                "source_uid": source["source_uid"],
                "source_order": index,
                "doc_title": source["doc_title"],
                "source_type": source["source_type"],
                "byte_size": source.get("source_filesize"),
                "object_key": source.get("source_locator"),
            }
            for index, source in enumerate(sources, start=1)
        ]
    ).execute()
    return get_source_set_detail(
        admin,
        owner_id=owner_id,
        pipeline_kind=pipeline_kind,
        source_set_id=source_set_id,
    ) or {}


def update_source_set(
    admin,
    *,
    owner_id: str,
    pipeline_kind: str,
    source_set_id: str,
    label: str | None,
    source_uids: list[str] | None,
    eligible_source_types: list[str],
) -> dict:
    current = _load_source_set_row(admin, owner_id, pipeline_kind, source_set_id)
    if not current:
        raise ValueError("Source set not found")

    if label is not None:
        admin.table("pipeline_source_sets").update({"label": label}).eq("source_set_id", source_set_id).execute()

    if source_uids is not None:
        sources = _load_owned_sources(admin, owner_id, current["project_id"], source_uids)
        if len(sources) != len(source_uids):
            raise ValueError("One or more sources were not found")
        if any(source["source_type"] not in eligible_source_types for source in sources):
            raise ValueError("One or more sources are not eligible for this pipeline")
        if not sources:
            raise ValueError("At least one markdown source must remain in the set")
        admin.table("pipeline_source_set_items").delete().eq("source_set_id", source_set_id).execute()
        admin.table("pipeline_source_set_items").insert(
            [
                {
                    "source_set_id": source_set_id,
                    "owner_id": owner_id,
                    "source_uid": source["source_uid"],
                    "source_order": index,
                    "doc_title": source["doc_title"],
                    "source_type": source["source_type"],
                    "byte_size": source.get("source_filesize"),
                    "object_key": source.get("source_locator"),
                }
                for index, source in enumerate(sources, start=1)
            ]
        ).execute()
        admin.table("pipeline_source_sets").update(
            {
                "member_count": len(sources),
                "total_bytes": sum(int(source.get("source_filesize") or 0) for source in sources),
            }
        ).eq("source_set_id", source_set_id).execute()

    return get_source_set_detail(
        admin,
        owner_id=owner_id,
        pipeline_kind=pipeline_kind,
        source_set_id=source_set_id,
    ) or {}

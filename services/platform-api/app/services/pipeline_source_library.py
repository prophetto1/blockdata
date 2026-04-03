from __future__ import annotations


def _load_pipeline_source_rows(
    admin,
    *,
    owner_id: str,
    project_id: str | None = None,
    pipeline_kind: str | None = None,
    pipeline_source_ids: list[str] | None = None,
) -> list[dict]:
    query = (
        admin.table("pipeline_sources")
        .select(
            "pipeline_source_id, owner_id, project_id, pipeline_kind, storage_service_slug, "
            "storage_object_id, source_uid, doc_title, source_type, byte_size, object_key, created_at"
        )
        .eq("owner_id", owner_id)
    )
    if project_id is not None:
        query = query.eq("project_id", project_id)
    if pipeline_kind is not None:
        query = query.eq("pipeline_kind", pipeline_kind)
    if pipeline_source_ids is not None:
        query = query.in_("pipeline_source_id", pipeline_source_ids)
    return query.execute().data or []


def _load_active_storage_objects(admin, *, owner_id: str, storage_object_ids: list[str]) -> dict[str, dict]:
    if not storage_object_ids:
        return {}
    rows = (
        admin.table("storage_objects")
        .select("storage_object_id, owner_user_id, bucket, content_type, status")
        .eq("owner_user_id", owner_id)
        .eq("status", "active")
        .in_("storage_object_id", storage_object_ids)
        .execute()
        .data
        or []
    )
    return {str(row["storage_object_id"]): row for row in rows}


def _serialize_pipeline_source(row: dict, storage_object: dict) -> dict:
    return {
        "pipeline_source_id": row["pipeline_source_id"],
        "source_uid": row["source_uid"],
        "project_id": row["project_id"],
        "pipeline_kind": row["pipeline_kind"],
        "storage_service_slug": row["storage_service_slug"],
        "storage_object_id": row["storage_object_id"],
        "doc_title": row["doc_title"],
        "source_type": row["source_type"],
        "content_type": storage_object.get("content_type"),
        "byte_size": row.get("byte_size"),
        "created_at": row.get("created_at"),
        "source_origin": "pipeline-services",
        "object_key": row["object_key"],
        "bucket": storage_object.get("bucket"),
    }


def list_pipeline_sources(
    admin,
    *,
    owner_id: str,
    project_id: str,
    pipeline_kind: str,
    search: str | None,
    eligible_source_types: list[str],
) -> list[dict]:
    rows = _load_pipeline_source_rows(
        admin,
        owner_id=owner_id,
        project_id=project_id,
        pipeline_kind=pipeline_kind,
    )
    storage_objects = _load_active_storage_objects(
        admin,
        owner_id=owner_id,
        storage_object_ids=[str(row["storage_object_id"]) for row in rows],
    )
    search_text = (search or "").strip().lower()

    items: list[dict] = []
    for row in rows:
        if row.get("source_type") not in eligible_source_types:
            continue
        if search_text and search_text not in str(row.get("doc_title") or "").lower():
            continue
        storage_object = storage_objects.get(str(row["storage_object_id"]))
        if not storage_object:
            continue
        item = _serialize_pipeline_source(row, storage_object)
        item.pop("pipeline_kind", None)
        item.pop("storage_service_slug", None)
        item.pop("storage_object_id", None)
        item.pop("bucket", None)
        items.append(item)
    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return items


def load_owned_pipeline_sources(
    admin,
    *,
    owner_id: str,
    project_id: str,
    pipeline_kind: str,
    pipeline_source_ids: list[str],
    eligible_source_types: list[str],
) -> list[dict]:
    rows = _load_pipeline_source_rows(
        admin,
        owner_id=owner_id,
        project_id=project_id,
        pipeline_kind=pipeline_kind,
        pipeline_source_ids=pipeline_source_ids,
    )
    storage_objects = _load_active_storage_objects(
        admin,
        owner_id=owner_id,
        storage_object_ids=[str(row["storage_object_id"]) for row in rows],
    )
    by_id: dict[str, dict] = {}
    for row in rows:
        if row.get("source_type") not in eligible_source_types:
            continue
        storage_object = storage_objects.get(str(row["storage_object_id"]))
        if not storage_object:
            continue
        by_id[str(row["pipeline_source_id"])] = _serialize_pipeline_source(row, storage_object)

    return [by_id[pipeline_source_id] for pipeline_source_id in pipeline_source_ids if pipeline_source_id in by_id]


def get_owned_pipeline_source(
    admin,
    *,
    owner_id: str,
    pipeline_source_id: str,
) -> dict | None:
    rows = _load_pipeline_source_rows(
        admin,
        owner_id=owner_id,
        pipeline_source_ids=[pipeline_source_id],
    )
    if not rows:
        return None
    row = rows[0]
    storage_objects = _load_active_storage_objects(
        admin,
        owner_id=owner_id,
        storage_object_ids=[str(row["storage_object_id"])],
    )
    storage_object = storage_objects.get(str(row["storage_object_id"]))
    if not storage_object:
        return None
    item = _serialize_pipeline_source(row, storage_object)
    item.pop("source_origin", None)
    return item

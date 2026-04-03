from __future__ import annotations

from app.services import pipeline_source_library


class _Query:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: list[tuple[str, object, str]] = []
        self._order_key: str | None = None
        self._order_desc = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key: str, value: object):
        self._filters.append((key, value, "eq"))
        return self

    def in_(self, key: str, values):
        self._filters.append((key, set(values), "in"))
        return self

    def order(self, key: str, *, desc: bool):
        self._order_key = key
        self._order_desc = desc
        return self

    def execute(self):
        rows = []
        for row in self._admin.tables.get(self._table_name, []):
            matched = True
            for key, expected, mode in self._filters:
                actual = row.get(key)
                if mode == "eq":
                    matched = actual == expected
                else:
                    matched = actual in expected
                if not matched:
                    break
            if matched:
                rows.append(dict(row))

        if self._order_key:
            rows.sort(key=lambda row: row.get(self._order_key), reverse=self._order_desc)
        return type("R", (), {"data": rows})()


class _Admin:
    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = tables

    def table(self, name: str):
        return _Query(self, name)


def test_list_pipeline_sources_filters_to_active_pipeline_owned_markdown_sources():
    admin = _Admin(
        {
            "pipeline_sources": [
                {
                    "pipeline_source_id": "psrc-good",
                    "owner_id": "user-1",
                    "project_id": "project-1",
                    "pipeline_kind": "markdown_index_builder",
                    "storage_service_slug": "index-builder",
                    "storage_object_id": "obj-good",
                    "source_uid": "src-good",
                    "doc_title": "Good",
                    "source_type": "md",
                    "byte_size": 12,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-good/source/good.md",
                    "created_at": "2026-04-02T10:00:00Z",
                },
                {
                    "pipeline_source_id": "psrc-pdf",
                    "owner_id": "user-1",
                    "project_id": "project-1",
                    "pipeline_kind": "markdown_index_builder",
                    "storage_service_slug": "index-builder",
                    "storage_object_id": "obj-pdf",
                    "source_uid": "src-pdf",
                    "doc_title": "PDF",
                    "source_type": "pdf",
                    "byte_size": 99,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-pdf/source/doc.pdf",
                    "created_at": "2026-04-02T09:00:00Z",
                },
            ],
            "storage_objects": [
                {
                    "storage_object_id": "obj-good",
                    "owner_user_id": "user-1",
                    "status": "active",
                    "bucket": "unit-bucket",
                    "content_type": "text/markdown",
                },
                {
                    "storage_object_id": "obj-pdf",
                    "owner_user_id": "user-1",
                    "status": "deleted",
                    "bucket": "unit-bucket",
                    "content_type": "application/pdf",
                },
            ],
        }
    )

    items = pipeline_source_library.list_pipeline_sources(
        admin,
        owner_id="user-1",
        project_id="project-1",
        pipeline_kind="markdown_index_builder",
        search=None,
        eligible_source_types=["md", "markdown"],
    )

    assert items == [
        {
            "pipeline_source_id": "psrc-good",
            "source_uid": "src-good",
            "project_id": "project-1",
            "doc_title": "Good",
            "source_type": "md",
            "content_type": "text/markdown",
            "byte_size": 12,
            "created_at": "2026-04-02T10:00:00Z",
            "source_origin": "pipeline-services",
            "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-good/source/good.md",
        }
    ]


def test_load_owned_pipeline_sources_preserves_requested_order():
    admin = _Admin(
        {
            "pipeline_sources": [
                {
                    "pipeline_source_id": "psrc-1",
                    "owner_id": "user-1",
                    "project_id": "project-1",
                    "pipeline_kind": "markdown_index_builder",
                    "storage_service_slug": "index-builder",
                    "storage_object_id": "obj-1",
                    "source_uid": "src-1",
                    "doc_title": "Doc 1",
                    "source_type": "md",
                    "byte_size": 10,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/doc-1.md",
                    "created_at": "2026-04-02T10:00:00Z",
                },
                {
                    "pipeline_source_id": "psrc-2",
                    "owner_id": "user-1",
                    "project_id": "project-1",
                    "pipeline_kind": "markdown_index_builder",
                    "storage_service_slug": "index-builder",
                    "storage_object_id": "obj-2",
                    "source_uid": "src-2",
                    "doc_title": "Doc 2",
                    "source_type": "markdown",
                    "byte_size": 20,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-2/source/doc-2.md",
                    "created_at": "2026-04-02T11:00:00Z",
                },
            ],
            "storage_objects": [
                {
                    "storage_object_id": "obj-1",
                    "owner_user_id": "user-1",
                    "status": "active",
                    "bucket": "unit-bucket",
                    "content_type": "text/markdown",
                },
                {
                    "storage_object_id": "obj-2",
                    "owner_user_id": "user-1",
                    "status": "active",
                    "bucket": "unit-bucket",
                    "content_type": "text/markdown",
                },
            ],
        }
    )

    items = pipeline_source_library.load_owned_pipeline_sources(
        admin,
        owner_id="user-1",
        project_id="project-1",
        pipeline_kind="markdown_index_builder",
        pipeline_source_ids=["psrc-2", "psrc-1"],
        eligible_source_types=["md", "markdown"],
    )

    assert [item["pipeline_source_id"] for item in items] == ["psrc-2", "psrc-1"]
    assert [item["source_uid"] for item in items] == ["src-2", "src-1"]


def test_get_owned_pipeline_source_resolves_storage_object_metadata():
    admin = _Admin(
        {
            "pipeline_sources": [
                {
                    "pipeline_source_id": "psrc-1",
                    "owner_id": "user-1",
                    "project_id": "project-1",
                    "pipeline_kind": "markdown_index_builder",
                    "storage_service_slug": "index-builder",
                    "storage_object_id": "obj-1",
                    "source_uid": "src-1",
                    "doc_title": "Doc 1",
                    "source_type": "md",
                    "byte_size": 10,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/doc-1.md",
                    "created_at": "2026-04-02T10:00:00Z",
                }
            ],
            "storage_objects": [
                {
                    "storage_object_id": "obj-1",
                    "owner_user_id": "user-1",
                    "status": "active",
                    "bucket": "unit-bucket",
                    "content_type": "text/markdown",
                }
            ],
        }
    )

    item = pipeline_source_library.get_owned_pipeline_source(
        admin,
        owner_id="user-1",
        pipeline_source_id="psrc-1",
    )

    assert item == {
        "pipeline_source_id": "psrc-1",
        "source_uid": "src-1",
        "project_id": "project-1",
        "pipeline_kind": "markdown_index_builder",
        "storage_service_slug": "index-builder",
        "storage_object_id": "obj-1",
        "doc_title": "Doc 1",
        "source_type": "md",
        "byte_size": 10,
        "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/doc-1.md",
        "created_at": "2026-04-02T10:00:00Z",
        "bucket": "unit-bucket",
        "content_type": "text/markdown",
    }

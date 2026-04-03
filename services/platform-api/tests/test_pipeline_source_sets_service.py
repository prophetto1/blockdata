from __future__ import annotations

import pytest

from app.services import pipeline_source_sets


class _Query:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._order_key: str | None = None
        self._order_desc = False
        self._limit: int | None = None
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key: str, value: object):
        self._filters[key] = value
        return self

    def in_(self, key: str, values):
        allowed = set(values)
        self._filters[key] = lambda row: row.get(key) in allowed
        return self

    def order(self, key: str, *, desc: bool):
        self._order_key = key
        self._order_desc = desc
        return self

    def limit(self, count: int):
        self._limit = count
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def execute(self):
        rows = []
        for row in self._admin.tables.get(self._table_name, []):
            matched = True
            for key, expected in self._filters.items():
                actual = row.get(key)
                if callable(expected):
                    matched = bool(expected(row))
                else:
                    matched = actual == expected
                if not matched:
                    break
            if matched:
                rows.append(dict(row))

        if self._order_key:
            rows.sort(key=lambda row: row.get(self._order_key), reverse=self._order_desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        if self._maybe_single:
            if not rows:
                raise RuntimeError("maybe_single cannot represent zero rows")
            return type("R", (), {"data": rows[0]})()
        return type("R", (), {"data": rows})()


class _Admin:
    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = tables

    def table(self, name: str):
        return _Query(self, name)


def test_list_source_sets_returns_latest_job_none_when_no_jobs_exist():
    admin = _Admin(
        {
            "pipeline_source_sets": [
                {
                    "source_set_id": "set-1",
                    "owner_id": "user-1",
                    "pipeline_kind": "markdown_index_builder",
                    "project_id": "project-1",
                    "label": "Untitled index job",
                    "member_count": 1,
                    "total_bytes": 51,
                    "created_at": "2026-04-02T00:00:00Z",
                    "updated_at": "2026-04-02T00:00:00Z",
                }
            ],
            "pipeline_jobs": [],
        }
    )

    items = pipeline_source_sets.list_source_sets(
        admin,
        owner_id="user-1",
        pipeline_kind="markdown_index_builder",
        project_id="project-1",
    )

    assert items == [
        {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Untitled index job",
            "member_count": 1,
            "total_bytes": 51,
            "created_at": "2026-04-02T00:00:00Z",
            "updated_at": "2026-04-02T00:00:00Z",
            "latest_job": None,
        }
    ]


def test_get_source_set_detail_returns_none_when_source_set_is_missing():
    admin = _Admin(
        {
            "pipeline_source_sets": [],
            "pipeline_source_set_items": [],
            "pipeline_jobs": [],
        }
    )

    detail = pipeline_source_sets.get_source_set_detail(
        admin,
        owner_id="user-1",
        pipeline_kind="markdown_index_builder",
        source_set_id="missing-set",
    )

    assert detail is None


def test_create_source_set_uses_pipeline_source_ids_and_persists_pipeline_source_id(monkeypatch):
    inserts: list[tuple[str, object]] = []

    monkeypatch.setattr(
        "app.services.pipeline_source_sets.pipeline_source_library.load_owned_pipeline_sources",
        lambda *_a, **_k: [
            {
                "pipeline_source_id": "psrc-1",
                "source_uid": "src-1",
                "doc_title": "Doc 1",
                "source_type": "md",
                "byte_size": 10,
                "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-1/source/doc-1.md",
            },
            {
                "pipeline_source_id": "psrc-2",
                "source_uid": "src-2",
                "doc_title": "Doc 2",
                "source_type": "markdown",
                "byte_size": 20,
                "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-2/source/doc-2.md",
            },
        ],
    )
    monkeypatch.setattr(
        "app.services.pipeline_source_sets.get_source_set_detail",
        lambda *_a, **_k: {"source_set_id": "set-1"},
    )
    monkeypatch.setattr("app.services.pipeline_source_sets.uuid4", lambda: "set-1")

    class _Writer:
        def __init__(self, table_name: str):
            self._table_name = table_name

        def insert(self, payload):
            inserts.append((self._table_name, payload))
            return self

        def execute(self):
            return type("R", (), {"data": []})()

    class _Admin:
        def table(self, name: str):
            return _Writer(name)

    result = pipeline_source_sets.create_source_set(
        _Admin(),
        owner_id="user-1",
        pipeline_kind="markdown_index_builder",
        project_id="project-1",
        label="Release corpus",
        pipeline_source_ids=["psrc-1", "psrc-2"],
        eligible_source_types=["md", "markdown"],
    )

    assert result == {"source_set_id": "set-1"}
    assert inserts == [
        (
            "pipeline_source_sets",
            {
                "source_set_id": "set-1",
                "pipeline_kind": "markdown_index_builder",
                "owner_id": "user-1",
                "project_id": "project-1",
                "label": "Release corpus",
                "member_count": 2,
                "total_bytes": 30,
            },
        ),
        (
            "pipeline_source_set_items",
            [
                {
                    "source_set_id": "set-1",
                    "owner_id": "user-1",
                    "pipeline_source_id": "psrc-1",
                    "source_uid": "src-1",
                    "source_order": 1,
                    "doc_title": "Doc 1",
                    "source_type": "md",
                    "byte_size": 10,
                    "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-1/source/doc-1.md",
                },
                {
                    "source_set_id": "set-1",
                    "owner_id": "user-1",
                    "pipeline_source_id": "psrc-2",
                    "source_uid": "src-2",
                    "source_order": 2,
                    "doc_title": "Doc 2",
                    "source_type": "markdown",
                    "byte_size": 20,
                    "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-2/source/doc-2.md",
                },
            ],
        ),
    ]


def test_update_source_set_replaces_items_using_pipeline_source_ids(monkeypatch):
    operations: list[tuple[str, str, object]] = []

    monkeypatch.setattr(
        "app.services.pipeline_source_sets._load_source_set_row",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Old label",
        },
    )
    monkeypatch.setattr(
        "app.services.pipeline_source_sets.pipeline_source_library.load_owned_pipeline_sources",
        lambda *_a, **_k: [
            {
                "pipeline_source_id": "psrc-2",
                "source_uid": "src-2",
                "doc_title": "Doc 2",
                "source_type": "md",
                "byte_size": 20,
                "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-2/source/doc-2.md",
            }
        ],
    )
    monkeypatch.setattr(
        "app.services.pipeline_source_sets.get_source_set_detail",
        lambda *_a, **_k: {"source_set_id": "set-1"},
    )

    class _Writer:
        def __init__(self, table_name: str):
            self._table_name = table_name
            self._mode = "select"
            self._payload = None

        def update(self, payload):
            self._mode = "update"
            self._payload = payload
            return self

        def delete(self):
            self._mode = "delete"
            return self

        def insert(self, payload):
            self._mode = "insert"
            self._payload = payload
            return self

        def eq(self, key: str, value: object):
            operations.append((self._table_name, f"{self._mode}:{key}", value))
            return self

        def execute(self):
            if self._mode in {"update", "insert"}:
                operations.append((self._table_name, self._mode, self._payload))
            else:
                operations.append((self._table_name, self._mode, None))
            return type("R", (), {"data": []})()

    class _Admin:
        def table(self, name: str):
            return _Writer(name)

    result = pipeline_source_sets.update_source_set(
        _Admin(),
        owner_id="user-1",
        pipeline_kind="markdown_index_builder",
        source_set_id="set-1",
        label="New label",
        pipeline_source_ids=["psrc-2"],
        eligible_source_types=["md", "markdown"],
    )

    assert result == {"source_set_id": "set-1"}
    assert operations == [
        ("pipeline_source_sets", "update:source_set_id", "set-1"),
        ("pipeline_source_sets", "update", {"label": "New label"}),
        ("pipeline_source_set_items", "delete:source_set_id", "set-1"),
        ("pipeline_source_set_items", "delete", None),
        (
            "pipeline_source_set_items",
            "insert",
            [
                {
                    "source_set_id": "set-1",
                    "owner_id": "user-1",
                    "pipeline_source_id": "psrc-2",
                    "source_uid": "src-2",
                    "source_order": 1,
                    "doc_title": "Doc 2",
                    "source_type": "md",
                    "byte_size": 20,
                    "object_key": "users/u/pipeline-services/index-builder/projects/project-1/sources/src-2/source/doc-2.md",
                }
            ],
        ),
        ("pipeline_source_sets", "update:source_set_id", "set-1"),
        (
            "pipeline_source_sets",
            "update",
            {
                "member_count": 1,
                "total_bytes": 20,
            },
        ),
    ]

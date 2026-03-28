from app.pipelines.registry import (
    get_pipeline_definition,
    get_pipeline_worker_definition,
    list_pipeline_definitions,
    list_pipeline_worker_definitions,
)


def test_pipeline_registry_lists_markdown_index_builder():
    items = list_pipeline_definitions()

    assert items == [
        {
            "pipeline_kind": "markdown_index_builder",
            "label": "Index Builder",
            "supports_manual_trigger": True,
            "eligible_source_types": ["md", "markdown"],
            "deliverable_kinds": ["lexical_sqlite", "semantic_zip"],
        }
    ]


def test_pipeline_registry_returns_none_for_unknown_kind():
    assert get_pipeline_definition("does_not_exist") is None


def test_pipeline_registry_returns_worker_definition_for_executable_pipeline():
    assert get_pipeline_worker_definition("markdown_index_builder") == {
        "pipeline_kind": "markdown_index_builder",
        "handler_module": "app.pipelines.markdown_index_builder",
        "handler_name": "run_markdown_index_builder",
    }
    assert list_pipeline_worker_definitions() == [
        {
            "pipeline_kind": "markdown_index_builder",
            "handler_module": "app.pipelines.markdown_index_builder",
            "handler_name": "run_markdown_index_builder",
        }
    ]

from app.domain import agchain
from app.domain.agchain import (
    AgchainDatasetSourceConfig,
    AgchainFieldSpec,
    AgchainOperationStatus,
    AgchainRunConfig,
    AgchainRunLogHeader,
    AgchainRunLogSample,
    AgchainRunLogSampleEvent,
    AgchainSample,
    AgchainSandboxProfile,
    AgchainScorerDefinition,
    AgchainTaskDefinition,
    AgchainToolDefinition,
)


def test_agchain_type_contract_symbols_are_re_exported():
    expected_symbols = {
        "AgchainSample",
        "AgchainFieldSpec",
        "AgchainDatasetSourceConfig",
        "AgchainTaskDefinition",
        "AgchainScorerDefinition",
        "AgchainToolDefinition",
        "AgchainSandboxProfile",
        "AgchainRunConfig",
        "AgchainOperationStatus",
        "AgchainRunLogHeader",
        "AgchainRunLogSample",
        "AgchainRunLogSampleEvent",
    }

    assert expected_symbols.issubset(set(agchain.__all__))


def test_agchain_sample_and_field_spec_contracts_lock_inspect_native_fields():
    assert list(AgchainSample.model_fields) == [
        "input",
        "messages",
        "choices",
        "target",
        "id",
        "metadata",
        "sandbox",
        "files",
        "setup",
    ]
    assert list(AgchainFieldSpec.model_fields) == [
        "input",
        "messages",
        "choices",
        "target",
        "id",
        "metadata",
        "sandbox",
        "files",
        "setup",
    ]


def test_agchain_dataset_task_run_and_operation_contracts_lock_expected_fields():
    assert list(AgchainDatasetSourceConfig.model_fields) == [
        "source_type",
        "source_uri",
        "delimiter",
        "headers",
        "dialect",
        "encoding",
        "path_hints",
        "line_mode",
        "path",
        "split",
        "name",
        "data_dir",
        "revision",
        "trust",
        "cached",
        "extra_kwargs",
    ]
    assert list(AgchainTaskDefinition.model_fields) == [
        "dataset_version_id",
        "task_name",
        "task_file_ref",
        "task_definition_jsonb",
        "solver_plan_jsonb",
        "scorer_refs_jsonb",
        "tool_refs_jsonb",
        "sandbox_profile_id",
        "sandbox_overrides_jsonb",
        "model_roles_jsonb",
        "generate_config_jsonb",
        "eval_config_jsonb",
    ]
    assert list(AgchainRunConfig.model_fields) == [
        "benchmark_version_id",
        "dataset_version_id",
        "evaluated_model_target_id",
        "judge_model_target_id",
        "tool_policy_jsonb",
        "sandbox_profile_id",
        "resolved_generate_config_jsonb",
        "resolved_eval_config_jsonb",
        "run_tags_jsonb",
        "idempotency_key",
    ]
    assert list(AgchainOperationStatus.model_fields) == [
        "operation_id",
        "operation_type",
        "status",
        "poll_url",
        "cancel_url",
        "target_kind",
        "target_id",
        "attempt_count",
        "progress",
        "last_error",
        "result",
        "created_at",
        "started_at",
        "heartbeat_at",
        "completed_at",
    ]


def test_agchain_registry_and_log_projection_contracts_lock_expected_fields():
    assert list(AgchainScorerDefinition.model_fields) == [
        "scorer_name",
        "display_name",
        "description",
        "metric_definitions_jsonb",
        "scorer_config_jsonb",
        "output_schema_jsonb",
        "is_builtin",
    ]
    assert list(AgchainToolDefinition.model_fields) == [
        "tool_name",
        "display_name",
        "description",
        "tool_schema_jsonb",
        "approval_required",
        "parallel_tool_calls_supported",
        "sandbox_requirements_jsonb",
        "viewer_hints_jsonb",
    ]
    assert list(AgchainSandboxProfile.model_fields) == [
        "provider",
        "profile_name",
        "config_jsonb",
        "limits_jsonb",
        "connection_capabilities_jsonb",
        "health_status",
        "health_checked_at",
        "notes",
    ]
    assert list(AgchainRunLogHeader.model_fields) == [
        "run_id",
        "benchmark_id",
        "benchmark_version_id",
        "dataset_version_id",
        "status",
        "score_summary",
        "usage_summary",
        "error_summary",
        "sample_count",
        "started_at",
        "completed_at",
        "updated_at",
    ]
    assert list(AgchainRunLogSample.model_fields) == [
        "run_id",
        "sample_run_id",
        "sample_id",
        "status",
        "score_summary",
        "error_summary",
        "token_usage",
        "has_attachments",
        "preview",
        "updated_at",
    ]
    assert list(AgchainRunLogSampleEvent.model_fields) == [
        "run_id",
        "sample_run_id",
        "event_index",
        "event_type",
        "event_at",
        "event_summary",
        "attachment_refs",
        "usage",
        "created_at",
    ]

"""Canonical AGChain Inspect-facing type contracts."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


JsonObject = dict[str, Any]
JsonList = list[dict[str, Any]]


class AgchainContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AgchainSample(AgchainContractModel):
    input: Any | None = None
    messages: JsonList | None = None
    choices: list[Any] | None = None
    target: Any | None = None
    id: str | None = None
    metadata: JsonObject = Field(default_factory=dict)
    sandbox: JsonObject | None = None
    files: JsonList | None = None
    setup: JsonObject | None = None


class AgchainFieldSpec(AgchainContractModel):
    input: JsonObject | None = None
    messages: JsonObject | None = None
    choices: JsonObject | None = None
    target: JsonObject | None = None
    id: JsonObject | None = None
    metadata: JsonObject | None = None
    sandbox: JsonObject | None = None
    files: JsonObject | None = None
    setup: JsonObject | None = None


class AgchainDatasetSourceConfig(AgchainContractModel):
    source_type: str
    source_uri: str | None = None
    delimiter: str | None = None
    headers: bool | list[str] | None = None
    dialect: str | None = None
    encoding: str | None = None
    path_hints: list[str] = Field(default_factory=list)
    line_mode: str | None = None
    path: str | None = None
    split: str | None = None
    name: str | None = None
    data_dir: str | None = None
    revision: str | None = None
    trust: bool | None = None
    cached: bool | None = None
    extra_kwargs: JsonObject = Field(default_factory=dict)


class AgchainToolRefBinding(AgchainContractModel):
    position: int | None = None
    tool_ref: str
    tool_version_id: str | None = None
    source_kind: str | None = None
    alias: str | None = None
    display_name: str | None = None
    config_overrides_jsonb: JsonObject = Field(default_factory=dict)


class AgchainResolvedToolManifestItem(AgchainContractModel):
    position: int
    tool_ref: str
    source_kind: str
    tool_version_id: str | None = None
    alias: str | None = None
    display_name: str
    runtime_name: str | None = None
    approval_mode: str = "manual"
    parallel_calls_allowed: bool = False
    input_schema_jsonb: JsonObject = Field(default_factory=dict)
    output_schema_jsonb: JsonObject = Field(default_factory=dict)
    config_overrides_jsonb: JsonObject = Field(default_factory=dict)
    missing_secret_slots: JsonList = Field(default_factory=list)
    resolution_status: str


class AgchainTaskDefinition(AgchainContractModel):
    dataset_version_id: str
    task_name: str | None = None
    task_file_ref: str | None = None
    task_definition_jsonb: JsonObject | None = None
    solver_plan_jsonb: JsonObject = Field(default_factory=dict)
    scorer_refs_jsonb: list[JsonObject] = Field(default_factory=list)
    tool_refs_jsonb: list[AgchainToolRefBinding] = Field(default_factory=list)
    sandbox_profile_id: str | None = None
    sandbox_overrides_jsonb: JsonObject = Field(default_factory=dict)
    model_roles_jsonb: JsonObject = Field(default_factory=dict)
    generate_config_jsonb: JsonObject = Field(default_factory=dict)
    eval_config_jsonb: JsonObject = Field(default_factory=dict)


class AgchainScorerDefinition(AgchainContractModel):
    scorer_name: str
    display_name: str
    description: str = ""
    metric_definitions_jsonb: JsonObject = Field(default_factory=dict)
    scorer_config_jsonb: JsonObject = Field(default_factory=dict)
    output_schema_jsonb: JsonObject = Field(default_factory=dict)
    is_builtin: bool = False


class AgchainToolDefinition(AgchainContractModel):
    tool_name: str
    display_name: str
    description: str = ""
    tool_schema_jsonb: JsonObject = Field(default_factory=dict)
    approval_required: bool = False
    parallel_tool_calls_supported: bool = False
    sandbox_requirements_jsonb: JsonObject = Field(default_factory=dict)
    viewer_hints_jsonb: JsonObject = Field(default_factory=dict)


class AgchainSandboxProfile(AgchainContractModel):
    provider: str
    profile_name: str
    config_jsonb: JsonObject = Field(default_factory=dict)
    limits_jsonb: JsonObject = Field(default_factory=dict)
    connection_capabilities_jsonb: JsonObject = Field(default_factory=dict)
    health_status: str = "unknown"
    health_checked_at: str | None = None
    notes: str = ""


class AgchainRunConfig(AgchainContractModel):
    benchmark_version_id: str
    dataset_version_id: str
    evaluated_model_target_id: str
    judge_model_target_id: str | None = None
    tool_policy_jsonb: JsonObject = Field(default_factory=dict)
    sandbox_profile_id: str | None = None
    resolved_generate_config_jsonb: JsonObject = Field(default_factory=dict)
    resolved_eval_config_jsonb: JsonObject = Field(default_factory=dict)
    run_tags_jsonb: JsonObject = Field(default_factory=dict)
    idempotency_key: str | None = None


class AgchainOperationStatus(AgchainContractModel):
    operation_id: str
    operation_type: str
    status: str
    poll_url: str | None = None
    cancel_url: str | None = None
    target_kind: str | None = None
    target_id: str | None = None
    attempt_count: int = 0
    progress: JsonObject = Field(default_factory=dict)
    last_error: JsonObject | None = None
    result: JsonObject | None = None
    created_at: str | None = None
    started_at: str | None = None
    heartbeat_at: str | None = None
    completed_at: str | None = None


class AgchainRunLogHeader(AgchainContractModel):
    run_id: str
    benchmark_id: str
    benchmark_version_id: str
    dataset_version_id: str | None = None
    status: str
    score_summary: JsonObject = Field(default_factory=dict)
    usage_summary: JsonObject = Field(default_factory=dict)
    error_summary: JsonObject = Field(default_factory=dict)
    sample_count: int = 0
    started_at: str | None = None
    completed_at: str | None = None
    updated_at: str | None = None


class AgchainRunLogSample(AgchainContractModel):
    run_id: str
    sample_run_id: str
    sample_id: str
    status: str
    score_summary: JsonObject = Field(default_factory=dict)
    error_summary: JsonObject = Field(default_factory=dict)
    token_usage: JsonObject = Field(default_factory=dict)
    has_attachments: bool = False
    preview: JsonObject = Field(default_factory=dict)
    updated_at: str | None = None


class AgchainRunLogSampleEvent(AgchainContractModel):
    run_id: str
    sample_run_id: str
    event_index: int
    event_type: str
    event_at: str | None = None
    event_summary: JsonObject = Field(default_factory=dict)
    attachment_refs: list[JsonObject] = Field(default_factory=list)
    usage: JsonObject = Field(default_factory=dict)
    created_at: str | None = None

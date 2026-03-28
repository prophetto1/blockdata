from __future__ import annotations

import asyncio
import importlib
import importlib.util
import json
import os
import subprocess
import sys
import threading
import types
from pathlib import Path
from typing import Any, get_type_hints

import pytest


RUNSPEC_ROOT = Path(__file__).resolve().parents[1] / "runspecs" / "3-STEP-RUN"
if str(RUNSPEC_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNSPEC_ROOT))

from adapters.model_adapter import AnthropicAdapter, ModelAdapter, OpenAIAdapter
from runtime.execution_backend import DirectBackend, resolve_backend
from runtime.execution_result import ExecutionResult
from runtime.runtime_config import RuntimeConfig


class DummyAdapter(ModelAdapter):
    def __init__(self, response: str = "stubbed response") -> None:
        self.response = response
        self.calls: list[dict[str, object]] = []

    @property
    def model_name(self) -> str:
        return "dummy-model"

    def call_model(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        self.calls.append(
            {
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        )
        return self.response


def test_execution_result_has_locked_fields_and_types() -> None:
    assert get_type_hints(ExecutionResult) == {
        "response_text": str,
        "backend": str,
        "model_name": str | None,
        "provider": str | None,
        "usage": dict[str, Any] | None,
        "timing_ms": float | None,
    }


def test_direct_backend_returns_execution_result() -> None:
    adapter = DummyAdapter(response='{"ok": true}')
    backend = DirectBackend(adapter)
    messages = [{"role": "user", "content": "hello"}]

    result = asyncio.run(backend.execute(messages))

    assert isinstance(result, ExecutionResult)
    assert result.response_text == '{"ok": true}'
    assert result.backend == "direct"
    assert result.model_name == "dummy-model"
    assert result.provider == "dummy"
    assert result.usage is None
    assert result.timing_ms is None


def test_direct_backend_forwards_temperature_and_max_tokens() -> None:
    adapter = DummyAdapter()
    backend = DirectBackend(adapter)
    messages = [{"role": "system", "content": "test"}]

    asyncio.run(backend.execute(messages, temperature=0.3, max_tokens=123))

    assert adapter.calls == [
        {
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 123,
        }
    ]


def test_direct_backend_offloads_sync_adapter_call_to_worker_thread() -> None:
    class ThreadRecordingAdapter(DummyAdapter):
        def __init__(self) -> None:
            super().__init__(response="threaded")
            self.thread_ids: list[int] = []

        def call_model(
            self,
            messages: list[dict[str, str]],
            *,
            temperature: float = 0.0,
            max_tokens: int = 4096,
        ) -> str:
            self.thread_ids.append(threading.get_ident())
            return super().call_model(messages, temperature=temperature, max_tokens=max_tokens)

    adapter = ThreadRecordingAdapter()
    backend = DirectBackend(adapter)

    asyncio.run(backend.execute([{"role": "user", "content": "hello"}]))

    assert adapter.thread_ids
    assert adapter.thread_ids[0] != threading.get_ident()


def test_resolve_backend_inspect_raises_actionable_import_error() -> None:
    with pytest.raises(ImportError, match="inspect_ai"):
        resolve_backend("inspect", provider="openai", model="gpt-4o")


def test_inspect_backend_can_be_instantiated_with_mocked_import(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}
    model_module = _make_fake_inspect_model_module(captured)
    real_import_module = importlib.import_module

    def fake_import_module(name: str) -> Any:
        if name == "inspect_ai.model":
            return model_module
        return real_import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    from runtime.inspect_backend import InspectBackend

    backend = InspectBackend(provider="openai", model="gpt-4o")

    assert backend is not None
    assert captured["model_name"] == "openai/gpt-4o"


def test_inspect_backend_execute_maps_model_output(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}
    model_module = _make_fake_inspect_model_module(captured)
    real_import_module = importlib.import_module

    def fake_import_module(name: str) -> Any:
        if name == "inspect_ai.model":
            return model_module
        return real_import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    from runtime.inspect_backend import InspectBackend

    backend = InspectBackend(provider="anthropic", model="claude-sonnet-test")
    messages = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    result = asyncio.run(backend.execute(messages, temperature=0.2, max_tokens=321))

    assert result.response_text == '{"grade": "A"}'
    assert result.backend == "inspect"
    assert result.model_name == "resolved-model"
    assert result.provider == "anthropic"
    assert result.timing_ms == 1500.0
    assert result.usage == {
        "input_tokens": 10,
        "output_tokens": 5,
        "total_tokens": 15,
        "total_cost": 0.25,
        "reasoning_tokens": 3,
    }
    assert set(result.usage) == {
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "total_cost",
        "reasoning_tokens",
    }
    assert captured["generate_calls"] == [
        {
            "messages": [
                {"role": "system", "content": "system prompt"},
                {"role": "user", "content": "user prompt"},
            ],
            "temperature": 0.2,
            "max_tokens": 321,
        }
    ]


def test_inspect_backend_execute_supports_assistant_messages(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}
    model_module = _make_fake_inspect_model_module(captured)
    real_import_module = importlib.import_module

    def fake_import_module(name: str) -> Any:
        if name == "inspect_ai.model":
            return model_module
        return real_import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    from runtime.inspect_backend import InspectBackend

    backend = InspectBackend(provider="openai", model="gpt-4o")
    messages = [
        {"role": "system", "content": "system prompt"},
        {"role": "assistant", "content": "previous answer"},
        {"role": "user", "content": "follow-up"},
    ]

    asyncio.run(backend.execute(messages))

    assert captured["generate_calls"] == [
        {
            "messages": [
                {"role": "system", "content": "system prompt"},
                {"role": "assistant", "content": "previous answer"},
                {"role": "user", "content": "follow-up"},
            ],
            "temperature": 0.0,
            "max_tokens": 4096,
        }
    ]


def test_openai_adapter_reuses_client_across_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    client_inits: list[dict[str, Any]] = []
    create_calls: list[dict[str, Any]] = []

    class FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str | None = None) -> None:
            client_inits.append({"api_key": api_key, "base_url": base_url})
            self.chat = types.SimpleNamespace(
                completions=types.SimpleNamespace(create=self._create)
            )

        def _create(self, **kwargs: Any) -> Any:
            create_calls.append(kwargs)
            return types.SimpleNamespace(
                choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="ok"))]
            )

    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(OpenAI=FakeOpenAI))

    adapter = OpenAIAdapter(model="gpt-4o-mini", api_key="test-key", base_url="http://localhost")
    messages = [{"role": "user", "content": "hello"}]

    assert adapter.call_model(messages) == "ok"
    assert adapter.call_model(messages, temperature=0.2, max_tokens=128) == "ok"

    assert client_inits == [{"api_key": "test-key", "base_url": "http://localhost"}]
    assert [call["temperature"] for call in create_calls] == [0.0, 0.2]
    assert [call["max_tokens"] for call in create_calls] == [4096, 128]


def test_anthropic_adapter_reuses_client_and_preserves_all_system_messages(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client_inits: list[str] = []
    create_calls: list[dict[str, Any]] = []

    class FakeAnthropic:
        def __init__(self, *, api_key: str) -> None:
            client_inits.append(api_key)
            self.messages = types.SimpleNamespace(create=self._create)

        def _create(self, **kwargs: Any) -> Any:
            create_calls.append(kwargs)
            return types.SimpleNamespace(
                content=[types.SimpleNamespace(text="anthropic ok")]
            )

    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=FakeAnthropic))

    adapter = AnthropicAdapter(model="claude-test", api_key="anthropic-key")
    messages = [
        {"role": "system", "content": "system one"},
        {"role": "user", "content": "user one"},
        {"role": "system", "content": "system two"},
        {"role": "assistant", "content": "assistant one"},
    ]

    assert adapter.call_model(messages) == "anthropic ok"
    assert adapter.call_model(messages, temperature=0.5, max_tokens=99) == "anthropic ok"

    assert client_inits == ["anthropic-key"]
    assert create_calls[0]["system"] == "system one\n\nsystem two"
    assert create_calls[0]["messages"] == [
        {"role": "user", "content": "user one"},
        {"role": "assistant", "content": "assistant one"},
    ]
    assert create_calls[1]["temperature"] == 0.5
    assert create_calls[1]["max_tokens"] == 99


def test_run_3s_help_includes_execution_backend_flag() -> None:
    result = subprocess.run(
        [sys.executable, str(RUNSPEC_ROOT / "run_3s.py"), "--help"],
        capture_output=True,
        text=True,
        cwd=RUNSPEC_ROOT.parent.parent,
        check=False,
    )

    assert result.returncode == 0
    assert "--execution-backend" in result.stdout


def test_run_single_eu_emits_execution_metadata_and_manifest(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    module = _load_run_3s_module()
    benchmark_dir, eu_dir = _write_minimal_runner_fixture(tmp_path)
    runs_dir = tmp_path / "runs"

    monkeypatch.setattr(module, "get_admitted_payloads", lambda step, eu_dir: {})
    monkeypatch.setattr(module, "create_staging", lambda runs_dir, run_id, call_id: runs_dir / run_id / call_id)
    monkeypatch.setattr(module, "stage_files", lambda staging_dir, step_def, payloads, candidate_state: [])
    monkeypatch.setattr(module, "cleanup_staging", lambda staging_dir: None)
    monkeypatch.setattr(
        module,
        "build_messages",
        lambda step_def, payloads, candidate_state, system_message: [{"role": "user", "content": step_def["prompt_template"]}],
    )
    monkeypatch.setattr(module, "score_d1_known_authority", lambda d1_output, ground_truth: {"score": 1.0, "correct": {}})
    monkeypatch.setattr(
        module,
        "score_citation_integrity",
        lambda **kwargs: {
            "anchor_validity": {
                "d9": {"valid_count": 1, "invalid_count": 0},
                "j10": {"valid_count": 1, "invalid_count": 0},
            }
        },
    )

    eval_backend = FakeBackend(
        [
            ExecutionResult('{"answer": "d1"}', "inspect", "resolved-eval-model", "openai", {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2, "total_cost": 0.01, "reasoning_tokens": 0}, 12.0),
            ExecutionResult('{"issue": "i", "rule": "r", "application": "a", "conclusion": "c"}', "inspect", "resolved-eval-model", "openai", {"input_tokens": 2, "output_tokens": 2, "total_tokens": 4, "total_cost": 0.02, "reasoning_tokens": 1}, 13.0),
            ExecutionResult('{"issue": "i", "rule": "r", "application": "a", "conclusion": "c"}', "inspect", "resolved-eval-model", "openai", {"input_tokens": 3, "output_tokens": 3, "total_tokens": 6, "total_cost": 0.03, "reasoning_tokens": 1}, 14.0),
        ]
    )
    judge_backend = FakeBackend(
        [
            ExecutionResult(
                '{"grades": {"d2": {"issue_score": 6, "rule_score": 6, "application_score": 6, "conclusion_score": 6}, "j3": {"issue_score": 5, "rule_score": 5, "application_score": 5, "conclusion_score": 5}}}',
                "inspect",
                "resolved-judge-model",
                "anthropic",
                {"input_tokens": 4, "output_tokens": 4, "total_tokens": 8, "total_cost": 0.04, "reasoning_tokens": 2},
                15.0,
            )
        ]
    )

    summary = asyncio.run(
        module.run_single_eu(
            benchmark_dir=benchmark_dir,
            eu_dir=eu_dir,
            runs_dir=runs_dir,
            eval_backend=eval_backend,
            judge_backend=judge_backend,
            eval_model_name="cli-eval-model",
            judge_model_name="cli-judge-model",
            execution_backend_name="inspect",
            run_id="run_test",
            runtime_config=RuntimeConfig(backend="inspect"),
        )
    )

    run_records = [
        json.loads(line)
        for line in (runs_dir / "run_test" / "run.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    manifest = json.loads((runs_dir / "run_test" / "run_manifest.json").read_text(encoding="utf-8"))

    model_call_record = next(record for record in run_records if record["type"] == "model_call")
    judge_record = next(record for record in run_records if record["type"] == "judge")

    assert model_call_record["model"] == "resolved-eval-model"
    assert model_call_record["execution_metadata"]["provider"] == "openai"
    assert model_call_record["execution_metadata"]["backend"] == "inspect"
    assert judge_record["model"] == "resolved-judge-model"
    assert judge_record["execution_metadata"]["provider"] == "anthropic"
    assert summary["eval_model"] == "resolved-eval-model"
    assert summary["judge_model"] == "resolved-judge-model"
    assert manifest["execution_backend"] == "inspect"
    assert manifest["reproducibility_key"] == "resolved-eval-model|resolved-judge-model|temp=0.0|replay_minimal"

    # Verify runtime_config.json written and included in manifest
    rc_path = runs_dir / "run_test" / "runtime_config.json"
    assert rc_path.exists(), "runtime_config.json should be written"
    rc_data = json.loads(rc_path.read_text(encoding="utf-8"))
    assert rc_data["backend"] == "inspect"
    assert rc_data["session_strategy"] == "replay_minimal"
    assert rc_data["supporting_logs_enabled"] is False
    assert rc_data["supporting_log_paths"] is None
    assert "runtime_config.json" in manifest["file_hashes"]

    # Verify manifest provenance derived from RuntimeConfig, not hard-coded
    assert manifest["session_strategy"] == "replay_minimal"
    assert "replay_minimal" in manifest["reproducibility_key"]


def test_run_3s_load_repo_env_uses_compat_parser_without_overwriting_existing_env(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module = _load_run_3s_module()
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# comment\nNEW_FROM_FILE=new-value\nEXISTING_FROM_ENV=from-file\nINVALID\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("NEW_FROM_FILE", raising=False)
    monkeypatch.setenv("EXISTING_FROM_ENV", "from-env")

    loaded = module._load_repo_env(env_file)

    assert loaded is True
    assert os.environ["NEW_FROM_FILE"] == "new-value"
    assert os.environ["EXISTING_FROM_ENV"] == "from-env"


def _make_fake_inspect_model_module(captured: dict[str, Any]) -> types.SimpleNamespace:
    class FakeGenerateConfig:
        def __init__(self, *, temperature: float, max_tokens: int) -> None:
            self.temperature = temperature
            self.max_tokens = max_tokens

    class FakeChatMessageSystem:
        def __init__(self, content: str) -> None:
            self.role = "system"
            self.content = content

    class FakeChatMessageUser:
        def __init__(self, content: str) -> None:
            self.role = "user"
            self.content = content

    class FakeChatMessageAssistant:
        def __init__(self, content: str) -> None:
            self.role = "assistant"
            self.content = content

    class FakeUsage:
        input_tokens = 10
        output_tokens = 5
        total_tokens = 15
        total_cost = 0.25
        reasoning_tokens = 3

    class FakeOutput:
        completion = '{"grade": "A"}'
        time = 1.5
        model = "resolved-model"
        usage = FakeUsage()

    class FakeModel:
        async def generate(self, messages: list[object], config: FakeGenerateConfig) -> FakeOutput:
            captured.setdefault("generate_calls", []).append(
                {
                    "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
                    "temperature": config.temperature,
                    "max_tokens": config.max_tokens,
                }
            )
            return FakeOutput()

    def fake_get_model(model_name: str, config: FakeGenerateConfig) -> FakeModel:
        captured["model_name"] = model_name
        captured["init_temperature"] = config.temperature
        captured["init_max_tokens"] = config.max_tokens
        return FakeModel()

    return types.SimpleNamespace(
        get_model=fake_get_model,
        GenerateConfig=FakeGenerateConfig,
        ChatMessageSystem=FakeChatMessageSystem,
        ChatMessageUser=FakeChatMessageUser,
        ChatMessageAssistant=FakeChatMessageAssistant,
    )


class FakeBackend:
    def __init__(self, results: list[ExecutionResult]) -> None:
        self._results = list(results)

    async def execute(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> ExecutionResult:
        assert self._results, "No fake backend results remaining"
        return self._results.pop(0)


def _load_run_3s_module() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location("legal10_run_3s_test", RUNSPEC_ROOT / "run_3s.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_minimal_runner_fixture(tmp_path: Path) -> tuple[Path, Path]:
    benchmark_dir = tmp_path / "benchmark"
    benchmark_dir.mkdir(parents=True)
    (benchmark_dir / "model_steps").mkdir()
    (benchmark_dir / "judge_prompts").mkdir()
    eu_dir = tmp_path / "eu__test"
    eu_dir.mkdir()

    _write_json(
        benchmark_dir / "benchmark.json",
        {"benchmark_id": "test-benchmark", "system_message": "You are a test system."},
    )
    _write_json(
        benchmark_dir / "plan.json",
        {
            "steps": [
                {"step_id": "d1", "step_file": "model_steps/d1.json", "inject_payloads": [], "scoring": "deterministic"},
                {"step_id": "d2", "step_file": "model_steps/d2.json", "inject_payloads": [], "scoring": "judge"},
                {
                    "step_id": "j3",
                    "step_file": "model_steps/j3.json",
                    "inject_payloads": [],
                    "scoring": "judge",
                    "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
                    "judge_grades_step_ids": ["d2", "j3"],
                },
            ]
        },
    )
    _write_json(benchmark_dir / "model_steps" / "d1.json", {"prompt_template": "d1 prompt"})
    _write_json(benchmark_dir / "model_steps" / "d2.json", {"prompt_template": "d2 prompt"})
    _write_json(benchmark_dir / "model_steps" / "j3.json", {"prompt_template": "j3 prompt"})
    _write_json(
        benchmark_dir / "judge_prompts" / "irac_mee_pair_v1.json",
        {
            "prompt_template": (
                "{STEP_IRAC_CLOSED_ID}|{STEP_IRAC_OPEN_ID}|{CLOSED_issue}|{CLOSED_rule}|"
                "{CLOSED_application}|{CLOSED_conclusion}|{OPEN_issue}|{OPEN_rule}|"
                "{OPEN_application}|{OPEN_conclusion}"
            )
        },
    )
    _write_json(
        eu_dir / "ground_truth.json",
        {"eu_id": "eu__test", "anchor_inventory_full": [], "rp_subset": []},
    )
    return benchmark_dir, eu_dir


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")

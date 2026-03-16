from __future__ import annotations

import io
from dataclasses import dataclass

import pytest

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext
from blockdata.worker.runner import run_worker_task
from blockdata.worker.worker_task import WorkerTask


def test_output_base_round_trips_to_dict_and_has_no_final_state() -> None:
    from blockdata.core.models.flows.state import State
    from blockdata.core.models.tasks.output import Output

    @dataclass(slots=True)
    class SampleOutput(Output):
        message: str

    output = SampleOutput(message="hello")

    assert output.final_state() is None
    assert output.to_dict() == {"message": "hello"}
    assert State.SUCCESS.value == "SUCCESS"


def test_file_serde_round_trips_jsonl_rows() -> None:
    from blockdata.core.serializers.file_serde import FileSerde

    rows = [{"name": "Ada"}, {"name": "Grace", "active": True}]
    buffer = io.StringIO()

    count = FileSerde.write_jsonl(buffer, rows)
    buffer.seek(0)
    decoded = list(FileSerde.read_jsonl(buffer))

    assert count == 2
    assert decoded == rows


def test_storage_local_backend_round_trips_file(tmp_path) -> None:
    from blockdata.core.storages.storage import LocalStorage

    storage = LocalStorage(tmp_path / "storage")
    uri = storage.put_file_bytes("rows.jsonl", b'{"name":"Ada"}\n')

    with storage.get_file(uri) as handle:
        assert handle.read() == b'{"name":"Ada"}\n'


def test_run_context_supports_plugin_configuration_and_identity_crypto() -> None:
    run_context = RunContext(execution_id="exec-config")
    run_context.set_plugin_configuration({"mongodb": {"uri": "mongodb://example"}})

    encrypted = run_context.encrypt("secret")

    assert encrypted == "secret"
    assert run_context.decrypt(encrypted) == "secret"
    assert run_context.plugin_configuration("mongodb") == {"uri": "mongodb://example"}


@dataclass(slots=True)
class EchoOutput:
    message: str


@dataclass(slots=True, kw_only=True)
class EchoTask(Task):
    message: Property[str]

    def run(self, run_context: RunContext) -> EchoOutput:
        run_context.metric("echo.calls", 1)
        return EchoOutput(message=run_context.render(self.message).as_type(str).or_else_throw())


@dataclass(slots=True, kw_only=True)
class FailingTask(Task):
    def run(self, run_context: RunContext) -> EchoOutput:
        raise ValueError("boom")


def test_run_worker_task_returns_success_result() -> None:
    from blockdata.core.models.flows.state import State

    task = EchoTask(id="echo", type="blockdata.test.echo", message=Property.of_value("{{ name }}"))
    run_context = RunContext(execution_id="exec-1", variables={"name": "Ada"})
    worker_task = WorkerTask(
        task=task,
        run_context=run_context,
        execution_id="exec-1",
        task_run_id="task-1",
    )

    result = run_worker_task(worker_task)

    assert result.state is State.SUCCESS
    assert result.attempt_number == 1
    assert result.output.message == "Ada"
    assert result.metrics["echo.calls"] == 1


def test_in_memory_queue_emits_and_receives_worker_task() -> None:
    from blockdata.queues.queue import InMemoryQueue

    task = EchoTask(id="echo", type="blockdata.test.echo", message=Property.of_value("Ada"))
    worker_task = WorkerTask(
        task=task,
        run_context=RunContext(execution_id="exec-queue"),
        execution_id="exec-queue",
        task_run_id="task-queue",
    )
    queue = InMemoryQueue()

    queue.emit(worker_task)
    queued = queue.receive_nowait()

    assert queued.task_run_id == "task-queue"
    assert queue.is_empty() is True


def test_run_worker_task_skips_disabled_and_run_if_false() -> None:
    from blockdata.core.models.flows.state import State

    disabled_task = EchoTask(
        id="echo",
        type="blockdata.test.echo",
        message=Property.of_value("ignored"),
        disabled=True,
    )
    disabled_result = run_worker_task(
        WorkerTask(
            task=disabled_task,
            run_context=RunContext(execution_id="exec-disabled"),
            execution_id="exec-disabled",
            task_run_id="task-disabled",
        )
    )

    conditional_task = EchoTask(
        id="echo",
        type="blockdata.test.echo",
        message=Property.of_value("ignored"),
        run_if="{{ should_run }}",
    )
    conditional_result = run_worker_task(
        WorkerTask(
            task=conditional_task,
            run_context=RunContext(execution_id="exec-skip", variables={"should_run": False}),
            execution_id="exec-skip",
            task_run_id="task-skip",
        )
    )

    assert disabled_result.state is State.SKIPPED
    assert conditional_result.state is State.SKIPPED


def test_run_worker_task_maps_allow_failure_to_warning() -> None:
    from blockdata.core.models.flows.state import State

    task = FailingTask(
        id="failing",
        type="blockdata.test.fail",
        allow_failure=True,
    )
    result = run_worker_task(
        WorkerTask(
            task=task,
            run_context=RunContext(execution_id="exec-warning"),
            execution_id="exec-warning",
            task_run_id="task-warning",
        )
    )

    assert result.state is State.WARNING
    assert result.error == "boom"


def test_run_worker_task_times_out() -> None:
    from blockdata.core.models.flows.state import State

    @dataclass(slots=True, kw_only=True)
    class SlowTask(Task):
        def run(self, run_context: RunContext) -> EchoOutput:
            import time

            time.sleep(0.05)
            return EchoOutput(message="done")

    task = SlowTask(
        id="slow",
        type="blockdata.test.slow",
        timeout=Property.of_value(0),
    )

    result = run_worker_task(
        WorkerTask(
            task=task,
            run_context=RunContext(execution_id="exec-timeout"),
            execution_id="exec-timeout",
            task_run_id="task-timeout",
        )
    )

    assert result.state is State.FAILED
    assert result.error is not None


def test_run_context_initializer_injects_task_and_taskrun_variables() -> None:
    from blockdata.core.runners.run_context_initializer import RunContextInitializer

    task = EchoTask(id="echo", type="blockdata.test.echo", message=Property.of_value("{{ name }}"))
    run_context = RunContext(execution_id="exec-init", variables={"name": "Ada"})
    worker_task = WorkerTask(
        task=task,
        run_context=run_context,
        execution_id="exec-init",
        task_run_id="task-init",
    )

    initialized = RunContextInitializer().for_worker(run_context, worker_task)

    assert initialized.variables["task"] is task
    assert initialized.variables["taskrun"]["id"] == "task-init"
    assert initialized.variables["execution"]["id"] == "exec-init"


def test_runner_raises_when_task_lacks_run() -> None:
    @dataclass(slots=True, kw_only=True)
    class InvalidTask(Task):
        pass

    task = InvalidTask(id="invalid", type="blockdata.test.invalid")
    result = run_worker_task(
        WorkerTask(
            task=task,
            run_context=RunContext(execution_id="exec-invalid"),
            execution_id="exec-invalid",
            task_run_id="task-invalid",
        )
    )

    assert result.error
    assert "run" in result.error

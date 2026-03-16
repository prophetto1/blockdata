from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, TimeoutError
from time import perf_counter
from typing import Any

from blockdata.core.models.flows.state import State
from blockdata.core.runners.run_context_initializer import RunContextInitializer
from blockdata.worker.worker_task import WorkerTask
from blockdata.worker.worker_task_callable import WorkerTaskCallable
from blockdata.worker.worker_task_result import WorkerTaskResult


def run_worker_task(worker_task: WorkerTask) -> WorkerTaskResult:
    started_at = perf_counter()
    attempt_number = worker_task.attempt_number + 1
    initialized_context = RunContextInitializer().for_worker(worker_task.run_context, worker_task)
    task = worker_task.task

    if task.disabled:
        return _build_result(
            worker_task=worker_task,
            state=State.SKIPPED,
            attempt_number=attempt_number,
            run_context=initialized_context,
            started_at=started_at,
        )

    if not _should_run(task.run_if, initialized_context):
        return _build_result(
            worker_task=worker_task,
            state=State.SKIPPED,
            attempt_number=attempt_number,
            run_context=initialized_context,
            started_at=started_at,
        )

    callable_wrapper = WorkerTaskCallable(worker_task, run_context=initialized_context)
    timeout_seconds = _resolve_timeout_seconds(task.timeout, initialized_context)

    try:
        if timeout_seconds is None:
            output = callable_wrapper.call()
        else:
            executor = ThreadPoolExecutor(max_workers=1)
            future = executor.submit(callable_wrapper.call)
            try:
                output = future.result(timeout=timeout_seconds)
            finally:
                executor.shutdown(wait=False, cancel_futures=True)
    except TimeoutError:
        return _build_result(
            worker_task=worker_task,
            state=State.FAILED,
            attempt_number=attempt_number,
            run_context=initialized_context,
            started_at=started_at,
            error=f"Task timed out after {timeout_seconds} seconds",
        )
    except Exception as exc:
        state = State.WARNING if task.allow_failure or task.allow_warning else State.FAILED
        return _build_result(
            worker_task=worker_task,
            state=state,
            attempt_number=attempt_number,
            run_context=initialized_context,
            started_at=started_at,
            error=str(exc),
        )

    return _build_result(
        worker_task=worker_task,
        state=_resolve_success_state(output),
        attempt_number=attempt_number,
        run_context=initialized_context,
        started_at=started_at,
        output=output,
    )


def _resolve_timeout_seconds(timeout_value: Any, run_context: Any) -> float | None:
    if timeout_value is None:
        return None
    rendered = run_context.render(timeout_value).as_type(float).or_else(None)
    if rendered is None:
        return None
    return max(float(rendered), 0.0)


def _should_run(run_if: Any, run_context: Any) -> bool:
    if run_if is None:
        return True
    rendered = run_context.render(run_if).value
    if isinstance(rendered, bool):
        return rendered
    if rendered is None:
        return False
    if isinstance(rendered, str):
        normalized = rendered.strip().lower()
        if normalized in {"", "0", "false", "no", "off", "none", "null"}:
            return False
        if normalized in {"1", "true", "yes", "on"}:
            return True
    return bool(rendered)


def _resolve_success_state(output: Any) -> State:
    final_state = getattr(output, "final_state", None)
    if callable(final_state):
        resolved = final_state()
        if isinstance(resolved, State):
            return resolved
        if resolved is not None:
            return State(str(resolved))
    return State.SUCCESS


def _build_result(
    *,
    worker_task: WorkerTask,
    state: State,
    attempt_number: int,
    run_context: Any,
    started_at: float,
    output: Any = None,
    error: str | None = None,
) -> WorkerTaskResult:
    duration_ms = int((perf_counter() - started_at) * 1000)
    return WorkerTaskResult(
        execution_id=worker_task.execution_id,
        task_run_id=worker_task.task_run_id,
        state=state,
        attempt_number=attempt_number,
        output=output,
        metrics=run_context.metrics(),
        duration_ms=duration_ms,
        error=error,
    )

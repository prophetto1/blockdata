from __future__ import annotations

from typing import Any

from blockdata.core.runners.run_context import RunContext


class RunContextInitializer:
    def for_worker(self, run_context: RunContext, worker_task: Any) -> RunContext:
        variables = dict(run_context.variables)
        variables["task"] = worker_task.task
        variables["taskrun"] = {
            "id": worker_task.task_run_id,
            "state": worker_task.state.value,
            "attempts": worker_task.attempt_number,
        }
        variables["execution"] = {"id": worker_task.execution_id}
        variables["outputs"] = dict(getattr(worker_task, "outputs", {}))
        variables["envs"] = dict(getattr(worker_task, "envs", {}))

        run_context.variables = variables
        run_context.execution_id = worker_task.execution_id
        run_context.task_run_id = worker_task.task_run_id
        run_context.set_plugin_configuration(getattr(worker_task, "plugin_configuration", None))
        return run_context

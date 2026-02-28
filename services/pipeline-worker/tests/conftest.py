import pytest
from app.shared.context import ExecutionContext


@pytest.fixture
def context():
    return ExecutionContext(
        execution_id="test-exec-001",
        task_run_id="test-run-001",
        variables={
            "inputs": {"name": "world"},
            "outputs": {"task1": {"value": 42}},
        },
    )

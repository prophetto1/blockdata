"""Base plugin contract — every plugin implements this."""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class PluginOutput(BaseModel):
    """Standardized output from every plugin execution."""

    data: dict[str, Any] = Field(default_factory=dict)
    state: str = "SUCCESS"  # SUCCESS | FAILED | WARNING
    logs: list[str] = Field(default_factory=list)


class PluginParam(BaseModel):
    """Schema for a single plugin parameter."""

    name: str
    type: str  # string, integer, boolean, array, object
    required: bool = False
    default: Any = None
    description: str = ""
    values: list[str] | None = None  # enum values


class BasePlugin(ABC):
    """
    Every plugin implements this. Maps to Kestra's RunnableTask<Output>.

    Subclasses set `task_types` to the Kestra plugin type strings they handle,
    then implement `run()` to execute the task logic.
    """

    task_types: list[str] = []

    @abstractmethod
    async def run(
        self, params: dict[str, Any], context: "ExecutionContext"
    ) -> PluginOutput:
        """Execute the plugin. Equivalent to Kestra's RunnableTask.run(RunContext)."""
        ...

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        """Return parameter definitions matching registry_service_functions.parameter_schema format."""
        return []

from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Mapping

from blockdata.core.models.property import Property
from blockdata.core.storages.storage import LocalStorage

_WHOLE_TEMPLATE = re.compile(r"^\s*\{\{\s*(.+?)\s*\}\}\s*$")
_PARTIAL_TEMPLATE = re.compile(r"\{\{\s*(.+?)\s*\}\}")


class RenderedValue:
    def __init__(self, value: Any):
        self._value = value

    @property
    def value(self) -> Any:
        return self._value

    def is_present(self) -> bool:
        return self._value is not None

    def or_else(self, default: Any) -> Any:
        return self._value if self._value is not None else default

    def or_else_throw(self) -> Any:
        if self._value is None:
            raise ValueError("Rendered value is missing")
        return self._value

    def as_type(self, target_type: type) -> "RenderedValue":
        if self._value is None:
            return RenderedValue(None)

        value = self._value
        if isinstance(value, target_type):
            return RenderedValue(value)

        if isinstance(target_type, type) and issubclass(target_type, Enum):
            if isinstance(value, str):
                try:
                    return RenderedValue(target_type[value])
                except KeyError:
                    return RenderedValue(target_type(value))
            return RenderedValue(target_type(value))

        if target_type is bool and isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on"}:
                return RenderedValue(True)
            if normalized in {"false", "0", "no", "off"}:
                return RenderedValue(False)

        return RenderedValue(target_type(value))

    def as_list(self, item_type: type | None = None) -> list[Any]:
        if self._value is None:
            return []
        if not isinstance(self._value, list):
            raise TypeError(f"Expected list, got {type(self._value)!r}")
        if item_type is None:
            return self._value
        return [item if isinstance(item, item_type) else item_type(item) for item in self._value]


class WorkingDirectory:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def create_temp_file(self, suffix: str = "") -> Path:
        return self.root / f"{uuid.uuid4().hex}{suffix}"


@dataclass(slots=True, kw_only=True)
class RunContext:
    execution_id: str = "exec"
    task_run_id: str = ""
    user_id: str = ""
    variables: dict[str, Any] = field(default_factory=dict)
    runtime_root: Path | None = None
    _metrics: dict[str, Any] = field(default_factory=dict, init=False)
    _logger: logging.Logger = field(init=False, repr=False)
    storage: LocalStorage = field(init=False)
    _working_directory: WorkingDirectory = field(init=False, repr=False)
    _plugin_configuration: Any = field(default=None, init=False, repr=False)
    _runtime_directory: Path = field(init=False, repr=False)

    def __post_init__(self) -> None:
        if self.runtime_root is None:
            project_root = Path(__file__).resolve().parents[3]
            runtime_root = project_root / ".runtime"
            root = runtime_root / f"{self.execution_id}-{uuid.uuid4().hex}"
        else:
            root = self.runtime_root
        self._runtime_directory = root
        self.storage = LocalStorage(root / "storage")
        self._working_directory = WorkingDirectory(root / "working")
        self._logger = logging.getLogger(f"kt.blockdata.{self.execution_id}")

    def logger(self) -> logging.Logger:
        return self._logger

    def working_dir(self) -> WorkingDirectory:
        return self._working_directory

    def metric(self, name: str, value: Any, **_: Any) -> None:
        self._metrics[name] = value

    def metric_value(self, name: str) -> Any:
        return self._metrics.get(name)

    def metrics(self) -> dict[str, Any]:
        return dict(self._metrics)

    def set_plugin_configuration(self, value: Any) -> None:
        self._plugin_configuration = value

    def plugin_configuration(self, name: str | None = None) -> Any:
        if name is None:
            return self._plugin_configuration
        if isinstance(self._plugin_configuration, Mapping):
            return self._plugin_configuration.get(name)
        return None

    def encrypt(self, plaintext: str) -> str:
        return plaintext

    def decrypt(self, encrypted: str) -> str:
        return encrypted

    def cleanup(self) -> None:
        if self.runtime_root is None and self._runtime_directory.exists():
            for child in self._runtime_directory.iterdir():
                if child.is_dir():
                    for nested in child.rglob("*"):
                        if nested.is_file():
                            nested.unlink()
                    for nested in sorted(child.rglob("*"), reverse=True):
                        if nested.is_dir():
                            nested.rmdir()
                    child.rmdir()
                elif child.is_file():
                    child.unlink()
            self._runtime_directory.rmdir()

    def render(self, value: Any) -> RenderedValue:
        if isinstance(value, Property):
            value = value.value
        return RenderedValue(self._render_value(value))

    def _render_value(self, value: Any) -> Any:
        if isinstance(value, str):
            whole_match = _WHOLE_TEMPLATE.match(value)
            if whole_match:
                return self._resolve_expression(whole_match.group(1))
            return _PARTIAL_TEMPLATE.sub(lambda match: str(self._resolve_expression(match.group(1))), value)

        if isinstance(value, Mapping):
            return {key: self._render_value(item) for key, item in value.items()}

        if isinstance(value, list):
            return [self._render_value(item) for item in value]

        if isinstance(value, tuple):
            return tuple(self._render_value(item) for item in value)

        return value

    def _resolve_expression(self, expression: str) -> Any:
        current: Any = self.variables
        for part in expression.split("."):
            part = part.strip()
            if isinstance(current, Mapping):
                current = current[part]
            else:
                current = getattr(current, part)
        return current

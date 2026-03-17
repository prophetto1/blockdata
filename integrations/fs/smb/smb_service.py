from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\smb\SmbService.java
# WARNING: Unresolved types: FileSystemOptions, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from integrations.fs.smb.smb_interface import SmbInterface


@dataclass(slots=True, kw_only=True)
class SmbService(ABC):

    @staticmethod
    def fs_options(run_context: RunContext, smb_interface: SmbInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

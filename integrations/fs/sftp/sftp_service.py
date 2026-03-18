from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\sftp\SftpService.java
# WARNING: Unresolved types: FileSystemOptions, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from integrations.fs.sftp.sftp_interface import SftpInterface


@dataclass(slots=True, kw_only=True)
class SftpService(ABC):

    @staticmethod
    def fs_options(run_context: RunContext, sftp_interface: SftpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

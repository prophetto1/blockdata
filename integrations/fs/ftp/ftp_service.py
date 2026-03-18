from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\ftp\FtpService.java
# WARNING: Unresolved types: FileSystemOptions, FtpFileSystemConfigBuilder, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FtpService(ABC):

    @staticmethod
    def fs_options(run_context: RunContext, ftp_interface: FtpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fs_options(instance: FtpFileSystemConfigBuilder, run_context: RunContext, ftp_interface: FtpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

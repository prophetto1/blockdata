from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\smb\Upload.java
# WARNING: Unresolved types: FileSystemOptions, IOException, fs, io, kestra, plugin, vfs

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.fs.smb.smb_interface import SmbInterface


@dataclass(slots=True, kw_only=True)
class Upload(Upload):
    """Upload a file over SMB"""
    port: Property[str] = Property.ofValue("445")

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

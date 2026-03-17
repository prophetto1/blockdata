from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\VfsService.java
# WARNING: Unresolved types: Action, Exception, FileSystemOptions, StandardFileSystemManager, URISyntaxException, fs, io, java, kestra, models, plugin, util, vfs

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.airtable.records.delete import Delete
from integrations.aws.s3.download import Download
from integrations.aws.s3.downloads import Downloads
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.dropbox.files.move import Move
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from integrations.aws.s3.upload import Upload


@dataclass(slots=True, kw_only=True)
class VfsService(ABC):

    @staticmethod
    def basic_auth(username: str, password: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uri(run_context: RunContext, scheme: str, host: str, port: str, username: str, password: str, filepath: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uri(scheme: str, host: str, port: int, username: str, password: str, filepath: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uri_without_auth(uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def list(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str, reg_exp: str, recursive: bool) -> List.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def download(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str) -> Download.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def upload(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str, to: str) -> Upload.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def upload(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str, to: str, overwrite: bool) -> Upload.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str, error_on_missing: bool) -> Delete.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def move(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, from: str, to: str, overwrite: bool) -> Move.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def perform_action(run_context: RunContext, fsm: StandardFileSystemManager, file_system_options: FileSystemOptions, blob_list: java.util.List[io.kestra.plugin.fs.vfs.models.File], action: Downloads.Action, move_directory: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_directory(uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extension(uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

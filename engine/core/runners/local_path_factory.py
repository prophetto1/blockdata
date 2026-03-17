from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\LocalPathFactory.java
# WARNING: Unresolved types: BasicFileAttributes, IOException, InputStream

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.core.runners.local_path import LocalPath
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LocalPathFactory:
    global_allowed_paths: list[str] | None = None

    def create_local_path(self, run_context: RunContext) -> LocalPath:
        raise NotImplementedError  # TODO: translate from Java

    def create_local_path(self) -> LocalPath:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AbstractLocalPath:

        def get(self, uri: str) -> InputStream:
            raise NotImplementedError  # TODO: translate from Java

        def exists(self, uri: str) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def get_attributes(self, uri: str) -> BasicFileAttributes:
            raise NotImplementedError  # TODO: translate from Java

        def check_path(self, uri: str) -> Path:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RunContextLocalPath(AbstractLocalPath):
        global_allowed_paths: list[str] | None = None
        run_context: RunContext | None = None

        def check_path(self, uri: str) -> Path:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DefaultLocalPath(AbstractLocalPath):
        global_allowed_paths: list[str] | None = None

        def check_path(self, uri: str) -> Path:
            raise NotImplementedError  # TODO: translate from Java

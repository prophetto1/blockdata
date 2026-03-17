from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\LocalWorkingDir.java
# WARNING: Unresolved types: BasicFileAttributes, FileVisitResult, SimpleFileVisitor

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, Callable, ClassVar

from engine.core.models.tasks.file_exist_comportment import FileExistComportment
from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class LocalWorkingDir:
    logger: ClassVar[Logger] = getLogger(__name__)
    working_dir_path: Path | None = None
    working_dir_id: str | None = None

    def path(self, create: bool | None = None) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def resolve(self, path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_temp_file(self, content: list[int] | None = None, extension: str | None = None) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_file(self, filename: str, content: list[int] | None = None) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, path: Path, input_stream: Any, comportment: FileExistComportment | None = None) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def copy_file(input_stream: Any, path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_files_matching(self, patterns: list[str]) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java

    def cleanup(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MatcherFileVisitor(SimpleFileVisitor):
        matched_files: list[Path] = field(default_factory=list)
        predicate: Callable[Path] | None = None

        def visit_file(self, path: Path, basic_file_attributes: BasicFileAttributes) -> FileVisitResult:
            raise NotImplementedError  # TODO: translate from Java

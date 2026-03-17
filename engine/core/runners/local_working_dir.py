from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\LocalWorkingDir.java
# WARNING: Unresolved types: BasicFileAttributes, FileVisitResult, IOException, InputStream, Predicate, SimpleFileVisitor

from dataclasses import dataclass, field
from logging import logging
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.tasks.file_exist_comportment import FileExistComportment
from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class LocalWorkingDir:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    working_dir_path: Path | None = None
    working_dir_id: str | None = None

    def path(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def path(self, create: bool) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def resolve(self, path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_temp_file(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_temp_file(self, extension: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_temp_file(self, content: list[int]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_temp_file(self, content: list[int], extension: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_file(self, filename: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_file(self, filename: str, content: list[int]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def create_file(self, filename: str, content: InputStream) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, path: Path, input_stream: InputStream) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, path: Path, input_stream: InputStream, comportment: FileExistComportment) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def copy_file(input_stream: InputStream, path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_files_matching(self, patterns: list[str]) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java

    def cleanup(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MatcherFileVisitor(SimpleFileVisitor):
        matched_files: list[Path] = field(default_factory=list)
        predicate: Predicate[Path] | None = None

        def visit_file(self, path: Path, basic_file_attributes: BasicFileAttributes) -> FileVisitResult:
            raise NotImplementedError  # TODO: translate from Java

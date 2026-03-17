from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\KestraIgnore.java
# WARNING: Unresolved types: GitIgnore, IOException

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KestraIgnore:
    kestra_ignore_file_name: ClassVar[str] = ".kestraignore"
    git_ignore: GitIgnore | None = None
    root_folder_path: Path | None = None

    def is_ignored_file(self, path: str, ignore_kestra_ignore_file: bool) -> bool:
        raise NotImplementedError  # TODO: translate from Java

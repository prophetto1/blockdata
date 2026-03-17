from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkingDirFactory.java

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class WorkingDirFactory:
    tmpdir_path: Optional[str] | None = None

    def create_working_directory(self) -> WorkingDir:
        raise NotImplementedError  # TODO: translate from Java

    def get_tmp_dir(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

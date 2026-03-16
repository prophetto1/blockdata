from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import BinaryIO, Protocol
from urllib.parse import urlparse


class Storage(Protocol):
    def put_file_bytes(self, name: str, content: bytes) -> str:
        ...

    def put_file(self, path: str | Path) -> str:
        ...

    def get_file(self, uri: str | Path) -> BinaryIO:
        ...


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def put_file_bytes(self, name: str, content: bytes) -> str:
        target = self.root / f"{uuid.uuid4().hex}-{Path(name).name}"
        target.write_bytes(content)
        return str(target)

    def put_file(self, path: str | Path) -> str:
        source = Path(path)
        target = self.root / f"{uuid.uuid4().hex}-{source.name}"
        shutil.copyfile(source, target)
        return str(target)

    def get_file(self, uri: str | Path) -> BinaryIO:
        return self._resolve_path(uri).open("rb")

    def _resolve_path(self, uri: str | Path) -> Path:
        if isinstance(uri, Path):
            return uri

        parsed = urlparse(uri)
        if parsed.scheme == "file":
            return Path(parsed.path)

        return Path(uri)

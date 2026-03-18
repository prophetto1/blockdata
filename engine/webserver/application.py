from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\Application.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Application:

    @staticmethod
    def main(args: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

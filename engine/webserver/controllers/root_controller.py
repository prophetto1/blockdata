from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\RootController.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class RootController:

    def ping(self) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

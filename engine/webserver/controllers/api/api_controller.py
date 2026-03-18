from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\ApiController.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ApiController:
    base_path: str | None = None

    def get_swagger_filename(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def rapidoc(self) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

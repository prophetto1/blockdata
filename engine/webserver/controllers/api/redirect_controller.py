from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\RedirectController.java

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class RedirectController:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    base_path: str | None = None

    def slash(self) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

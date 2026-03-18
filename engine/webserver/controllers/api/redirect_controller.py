from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\RedirectController.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class RedirectController:
    logger: ClassVar[Logger] = getLogger(__name__)
    base_path: str | None = None

    def slash(self) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

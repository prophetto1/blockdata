from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\templates\TemplateSource.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.templates.template import Template


@dataclass(slots=True, kw_only=True)
class TemplateSource(Template):
    source: str | None = None
    exception: str | None = None

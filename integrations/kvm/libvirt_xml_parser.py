from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class LibvirtXmlParser:

    def get_volumes_grouped_by_pool(self, domain: Domain) -> dict[String, List[String]]:
        raise NotImplementedError  # TODO: translate from Java

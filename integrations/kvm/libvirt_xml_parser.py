from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\LibvirtXmlParser.java
# WARNING: Unresolved types: Domain, Exception

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LibvirtXmlParser:

    @staticmethod
    def get_volumes_grouped_by_pool(domain: Domain) -> dict[str, list[str]]:
        raise NotImplementedError  # TODO: translate from Java

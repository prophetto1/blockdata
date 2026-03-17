from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\URIFetcher.java
# WARNING: Unresolved types: IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class URIFetcher:
    s_u_p_p_o_r_t_e_d__s_c_h_e_m_e_s: list[str] = List.of(StorageContext.KESTRA_SCHEME, LocalPath.FILE_SCHEME, Namespace.NAMESPACE_FILE_SCHEME)
    uri: str | None = None

    @staticmethod
    def of(uri: str) -> URIFetcher:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(uri: str) -> URIFetcher:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def supports(uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def supports(uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, run_context: RunContext) -> InputStream:
        raise NotImplementedError  # TODO: translate from Java

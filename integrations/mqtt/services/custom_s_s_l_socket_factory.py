from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class CustomSSLSocketFactory:

    def create_s_s_l_socket_factory(self, certificate_file_path: str) -> SSLSocketFactory:
        raise NotImplementedError  # TODO: translate from Java

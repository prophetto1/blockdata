from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\AppConfigValidator.java
# WARNING: Unresolved types: Environment, RuntimeException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AppConfigValidator:
    k_e_s_t_r_a__u_r_l__k_e_y: str = "kestra.url"
    environment: Environment | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_kestra_url_valid(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AppConfigException(RuntimeException):
        serial_version_u_i_d: int = 1

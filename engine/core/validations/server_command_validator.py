from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\ServerCommandValidator.java
# WARNING: Unresolved types: Environment, RuntimeException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ServerCommandValidator:
    v_a_l_i_d_a_t_e_d__p_r_o_p_e_r_t_i_e_s: dict[str, str] = Map.of(
        "kestra.queue.type", "https://kestra.io/docs/configuration-guide/setup#queue-configuration",
        "kestra.repository.type", "https://kestra.io/docs/configuration-guide/setup#repository-configuration",
        "kestra.storage.type", "https://kestra.io/docs/configuration-guide/setup#internal-storage-configuration"
    )
    environment: Environment | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ServerCommandException(RuntimeException):
        serial_version_u_i_d: int = 1

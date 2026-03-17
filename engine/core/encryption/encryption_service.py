from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\encryption\EncryptionService.java
# WARNING: Unresolved types: GeneralSecurityException, IllegalArgumentException, SecureRandom

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class EncryptionService:
    c_i_p_h_e_r__a_l_g_o_r_i_t_h_m: ClassVar[str] = "AES/GCM/NoPadding"
    k_e_y__a_l_g_o_r_i_t_h_m: ClassVar[str] = "AES"
    i_v__l_e_n_g_t_h: ClassVar[int] = 12
    a_u_t_h__t_a_g__l_e_n_g_t_h: ClassVar[int] = 128
    s_e_c_u_r_e__r_a_n_d_o_m: ClassVar[SecureRandom] = new SecureRandom()

    @staticmethod
    def encrypt(key: str, plain_text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def encrypt(key: str, plain_text: list[int]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decrypt(key: str, cipher_text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decrypt(key: str, cipher_text: list[int]) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_iv() -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\BasicAuthService.java
# WARNING: Unresolved types: ApplicationEventPublisher, Pattern

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.webserver.services.basic_auth_credentials import BasicAuthCredentials
from engine.core.services.instance_service import InstanceService
from engine.webserver.models.events.oss_auth_event import OssAuthEvent
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface


@dataclass(slots=True, kw_only=True)
class BasicAuthService:
    b_a_s_i_c__a_u_t_h__s_e_t_t_i_n_g_s__k_e_y: ClassVar[str] = "kestra.server.basic-auth"
    b_a_s_i_c__a_u_t_h__e_r_r_o_r__c_o_n_f_i_g: ClassVar[str] = "kestra.server.authentication-configuration-error"
    e_m_a_i_l__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$")
    p_a_s_s_w_o_r_d__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*")
    e_m_a_i_l__p_a_s_s_w_o_r_d__m_a_x__l_e_n: ClassVar[int] = 256
    setting_repository: SettingRepositoryInterface | None = None
    basic_auth_configuration: BasicAuthConfiguration | None = None
    instance_service: InstanceService | None = None
    oss_auth_event_publisher: ApplicationEventPublisher[OssAuthEvent] | None = None

    def init(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, basic_auth_credentials: BasicAuthCredentials) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validation_errors(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self) -> ConfiguredBasicAuth:
        raise NotImplementedError  # TODO: translate from Java

    def is_basic_auth_initialized(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BasicAuthConfiguration:
        username: str | None = None
        password: str | None = None
        realm: str | None = None
        open_urls: list[str] | None = None

    @dataclass(slots=True)
    class ConfiguredBasicAuth:
        realm: str | None = None
        open_urls: list[str] | None = None
        credentials: SaltedBasicAuthCredentials | None = None

    @dataclass(slots=True)
    class SaltedBasicAuthCredentials:
        salt: str | None = None
        username: str | None = None
        password: str | None = None

        @staticmethod
        def salt(salt: str, username: str, password: str) -> SaltedBasicAuthCredentials:
            raise NotImplementedError  # TODO: translate from Java

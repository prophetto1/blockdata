from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\AbstractGitTask.java
# WARNING: Unresolved types: AtomicReference, CertificateException, DiffEntry, Exception, Git, GitAPIException, IOException, Pattern, Repository, T, TransportCommand, X509Certificate, X509TrustManager, cert, java, security

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractGitTask(ABC, Task):
    p_e_b_b_l_e__t_e_m_p_l_a_t_e__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("^\\s*\\{\\{")
    s_s_l__c_o_n_f_i_g_u_r_e_d__k_e_y: ClassVar[AtomicReference[str]] = new AtomicReference<>(null)
    s_s_l__c_o_n_f_i_g__l_o_c_k: ClassVar[Any] = new Object()
    connect_timeout: Property[int] = Property.ofValue(10000)
    read_timeout: Property[int] = Property.ofValue(60000)
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    private_key: Property[str] | None = None
    passphrase: Property[str] | None = None
    trusted_ca_pem_path: Property[str] | None = None
    no_proxy: Property[bool] | None = None
    git_config: Property[dict[str, Any]] | None = None

    @abstractmethod
    def get_branch(self) -> Property[str]:
        ...

    def configure_http_transport(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def configure_environment_with_ssl(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compute_desired_ssl_key(pem_path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_jvm_default_trust_manager() -> X509TrustManager:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_trust_manager_from_pem(pem_file: Path) -> X509TrustManager:
        raise NotImplementedError  # TODO: translate from Java

    def authentified(self, command: T, run_context: RunContext) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def apply_git_config(self, repository: Repository, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_ion_diff(self, run_context: RunContext, git: Git) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_path(diff_entry: DiffEntry) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_commit_url(self, http_url: str, branch: str, commit_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CompositeX509TrustManager:
        delegates: list[X509TrustManager] | None = None

        def check_client_trusted(self, chain: list[X509Certificate], auth_type: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def check_server_trusted(self, chain: list[X509Certificate], auth_type: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def get_accepted_issuers(self) -> list[X509Certificate]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DiffLine:
        file: str | None = None
        key: str | None = None
        kind: Kind | None = None
        action: Action | None = None

        @staticmethod
        def added(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def updated_git(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def updated_kestra(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def unchanged(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def deleted_git(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def deleted_kestra(file: str, key: str, kind: Kind) -> DiffLine:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def write_ion_file(run_context: RunContext, diffs: list[DiffLine]) -> str:
            raise NotImplementedError  # TODO: translate from Java

    class Kind(str, Enum):
        FLOW = "FLOW"
        FILE = "FILE"
        DASHBOARD = "DASHBOARD"

    class Action(str, Enum):
        ADDED = "ADDED"
        UPDATED_GIT = "UPDATED_GIT"
        UPDATED_KES = "UPDATED_KES"
        UNCHANGED = "UNCHANGED"
        DELETED_GIT = "DELETED_GIT"
        DELETED_KES = "DELETED_KES"

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\ssh\Command.java
# WARNING: Unresolved types: AtomicInteger, AuthMethod, ConcurrentHashMap, Exception, InputStream, OutputStream, Proxy, Runnable, Socket, SocketFactory, UserInfo, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.runner.process import Process
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.fs.ssh.ssh_interface import SshInterface
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Command(Task):
    """Run commands over SSH"""
    commands: list[str]
    s_l_e_e_p__d_e_l_a_y__m_s: ClassVar[int] = 25
    open_s_s_h_config_dir: Property[str] = Property.ofValue("~/.ssh/config")
    auth_method: Property[AuthMethod] = Property.ofValue(AuthMethod.PASSWORD)
    port: Property[str] = Property.ofValue("22")
    strict_host_key_checking: Property[str] = Property.ofValue("no")
    enable_ssh_rsa1: Property[bool] = Property.ofValue(false)
    host: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    private_key: Property[str] | None = None
    private_key_passphrase: Property[str] | None = None
    open_s_s_h_config_path: Property[str] | None = None
    proxy_command: Property[str] | None = None
    env: Property[dict[str, str]] | None = None
    warning_on_std_err: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BasicUserInfo:
        passphrase: str | None = None

        def get_passphrase(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_password(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def prompt_password(self, message: str) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def prompt_passphrase(self, message: str) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def prompt_yes_no(self, message: str) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def show_message(self, message: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ProcessProxyCommand:
        command: str | None = None
        username: str | None = None
        process: Process | None = None
        input_stream: InputStream | None = None
        output_stream: OutputStream | None = None

        def connect(self, socket_factory: SocketFactory, host: str, port: int, timeout: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def shell_command(command: str) -> list[str]:
            raise NotImplementedError  # TODO: translate from Java

        def get_input_stream(self) -> InputStream:
            raise NotImplementedError  # TODO: translate from Java

        def get_output_stream(self) -> OutputStream:
            raise NotImplementedError  # TODO: translate from Java

        def get_socket(self) -> Socket:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LogRunnable:
        count: AtomicInteger = new AtomicInteger(0)
        outputs: dict[str, Any] = new ConcurrentHashMap<>()
        input_stream: InputStream | None = None
        is_std_err: bool | None = None
        run_context: RunContext | None = None

        def run(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        exit_code: int
        vars: dict[str, Any] | None = None
        std_out_line_count: int | None = None
        std_err_line_count: int | None = None

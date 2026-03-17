from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\PulsarConnectionInterface.java
# WARNING: Unresolved types: TlsOptions

from typing import Any, Protocol

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from engine.core.models.property.property import Property


class PulsarConnectionInterface(Protocol):
    def get_uri(self) -> Property[str]: ...

    def get_authentication_token(self) -> Property[str]: ...

    def get_tls_options(self) -> AbstractPulsarConnection.TlsOptions: ...

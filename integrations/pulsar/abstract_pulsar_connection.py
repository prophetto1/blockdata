from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\AbstractPulsarConnection.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from integrations.pulsar.schema_type import SchemaType
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPulsarConnection(ABC, Task):
    schema_type: Property[SchemaType] = Property.ofValue(SchemaType.NONE)
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: TlsOptions | None = None
    schema_string: Property[str] | None = None

    @dataclass(slots=True)
    class TlsOptions:
        cert: Property[str] | None = None
        key: Property[str] | None = None
        ca: Property[str] | None = None

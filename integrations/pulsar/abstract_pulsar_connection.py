from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from engine.core.docs.schema_type import SchemaType
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPulsarConnection(Task, PulsarConnectionInterface):
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: TlsOptions | None = None
    schema_string: Property[str] | None = None
    schema_type: Property[SchemaType] | None = None

    @dataclass(slots=True)
    class TlsOptions:
        cert: Property[str] | None = None
        key: Property[str] | None = None
        ca: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class TlsOptions:
    cert: Property[str] | None = None
    key: Property[str] | None = None
    ca: Property[str] | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-snmp\src\main\java\io\kestra\plugin\snmp\AbstractSnmpTask.java
# WARNING: Unresolved types: OID

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSnmpTask(ABC, Task):
    trap_oid: Property[str]
    host: Property[str] = Property.ofValue("localhost")
    port: Property[int] = Property.ofValue(162)
    snmp_version: Property[str] = Property.ofValue("v2c")
    timeout_ms: Property[int] = Property.ofValue(1500)
    community: Property[str] | None = None
    v3: Property[V3Security] | None = None
    bindings: Property[list[VarBind]] | None = None

    @staticmethod
    def to_sec_level(sec: AbstractSnmpTask.V3Security) -> int:
        raise NotImplementedError  # TODO: translate from Java

    class AuthProtocol(str, Enum):
        MD5 = "MD5"
        SHA = "SHA"
        SHA224 = "SHA224"
        SHA256 = "SHA256"
        SHA384 = "SHA384"
        SHA512 = "SHA512"

    class PrivProtocol(str, Enum):
        DES = "DES"
        AES128 = "AES128"
        AES192 = "AES192"
        AES256 = "AES256"

    @dataclass(slots=True)
    class VarBind:
        oid: Property[str]
        value: Property[str]

    @dataclass(slots=True)
    class V3Security:
        username: str
        auth_protocol: str | None = None
        auth_password: str | None = None
        priv_protocol: str | None = None
        priv_password: str | None = None

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


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


@dataclass(slots=True, kw_only=True)
class AbstractSnmpTask(Task):
    host: Property[str] | None = None
    port: Property[int] | None = None
    snmp_version: Property[str] | None = None
    community: Property[str] | None = None
    v3: Property[V3Security] | None = None
    trap_oid: Property[str]
    bindings: Property[list[VarBind]] | None = None
    timeout_ms: Property[int] | None = None

    def to_sec_level(self, sec: AbstractSnmpTask) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class VarBind:
        oid: Property[str] | None = None
        value: Property[str]

    @dataclass(slots=True)
    class V3Security:
        username: str | None = None
        auth_protocol: str | None = None
        auth_password: str | None = None
        priv_protocol: str | None = None
        priv_password: str | None = None


@dataclass(slots=True, kw_only=True)
class VarBind:
    oid: Property[str] | None = None
    value: Property[str]


@dataclass(slots=True, kw_only=True)
class V3Security:
    username: str | None = None
    auth_protocol: str | None = None
    auth_password: str | None = None
    priv_protocol: str | None = None
    priv_password: str | None = None

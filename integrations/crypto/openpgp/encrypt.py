from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-crypto\src\main\java\io\kestra\plugin\crypto\openpgp\Encrypt.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.crypto.openpgp.abstract_pgp import AbstractPgp
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Encrypt(AbstractPgp):
    """Encrypt and optionally sign files with OpenPGP"""
    recipients: Property[list[str]]
    from: Property[str] | None = None
    key: Property[str] | None = None
    sign_public_key: Property[str] | None = None
    sign_private_key: Property[str] | None = None
    sign_passphrase: Property[str] | None = None
    sign_user: Property[str] | None = None

    def run(self, run_context: RunContext) -> Encrypt.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

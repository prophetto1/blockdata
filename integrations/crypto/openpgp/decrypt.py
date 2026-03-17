from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-crypto\src\main\java\io\kestra\plugin\crypto\openpgp\Decrypt.java
# WARNING: Unresolved types: Exception, PGPException, PGPPublicKey, PGPPublicKeyRingCollection, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.crypto.openpgp.abstract_pgp import AbstractPgp
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Decrypt(AbstractPgp):
    """Decrypt and optionally verify OpenPGP files"""
    from: Property[str] | None = None
    private_key: Property[str] | None = None
    private_key_passphrase: Property[str] | None = None
    sign_users_key: Property[list[str]] | None = None
    required_signer_users: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Decrypt.Output:
        raise NotImplementedError  # TODO: translate from Java

    def find_public_key(self, collections: list[PGPPublicKeyRingCollection], key_i_d: int) -> PGPPublicKey:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class IonToLdif(Task, RunnableTask):
    """Convert Ion records to LDIF for LDAP"""
    inputs: list[String]
    count: int | None = None
    found: int | None = None
    logger: Logger | None = None

    def run(self, run_context: RunContext) -> IonToLdif:
        raise NotImplementedError  # TODO: translate from Java

    def transform_ion_to_ldif(self, ion_file_path: str, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def process_ion_entries(self, ion_reader: IonReader, ldif_writer: LDIFWriter) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def read_ion_entry(self, ion_reader: IonReader) -> LDIFRecord:
        raise NotImplementedError  # TODO: translate from Java

    def read_new_dn(self, ion_reader: IonReader) -> NewDn:
        raise NotImplementedError  # TODO: translate from Java

    def read_modifications(self, ion_reader: IonReader) -> list[Modification]:
        raise NotImplementedError  # TODO: translate from Java

    def read_attributes(self, ion_reader: IonReader) -> list[Attribute]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uris_list: list[URI] | None = None

    @dataclass(slots=True)
    class NewDn:
        new_r_d_n: str
        delete_old_r_d_n: bool
        newsuperior: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uris_list: list[URI] | None = None


@dataclass(slots=True, kw_only=True)
class NewDn:
    new_r_d_n: str
    delete_old_r_d_n: bool
    newsuperior: str | None = None

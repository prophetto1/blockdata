from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ion\IonFactory.java
# WARNING: Unresolved types: Closeable, IOContext, IOException, IonSystem, IonWriter, JsonParser, Reader, com, dataformat, fasterxml, ion, jackson

from dataclasses import dataclass
from typing import Any

from engine.core.serializers.ion.ion_generator import IonGenerator


@dataclass(slots=True, kw_only=True)
class IonFactory(IonFactory):
    serial_version_u_i_d: int = 1

    def _create_parser(self, r: Reader, ctxt: IOContext) -> JsonParser:
        raise NotImplementedError  # TODO: translate from Java

    def _create_generator(self, ion: IonWriter, ion_writer_is_managed: bool, ctxt: IOContext, dst: Closeable) -> com.fasterxml.jackson.dataformat.ion.IonGenerator:
        raise NotImplementedError  # TODO: translate from Java

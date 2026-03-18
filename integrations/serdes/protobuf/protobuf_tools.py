from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\protobuf\ProtobufTools.java
# WARNING: Unresolved types: Descriptor, DescriptorValidationException, Descriptors, FileDescriptor, FileDescriptorProto, FileDescriptorSet

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ProtobufTools:

    @staticmethod
    def find_message_descriptor(descriptor_set: FileDescriptorSet, fully_qualified_type_name: str) -> Descriptor:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_file_descriptor(file_proto: FileDescriptorProto, set: FileDescriptorSet, cache: dict[str, FileDescriptor]) -> FileDescriptor:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_message_recursively(fd: FileDescriptor, full_name: str) -> Descriptor:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_in_descriptor(desc: Descriptor, full_name: str) -> Descriptor:
        raise NotImplementedError  # TODO: translate from Java

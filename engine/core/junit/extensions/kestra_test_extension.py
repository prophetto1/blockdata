from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\KestraTestExtension.java
# WARNING: Unresolved types: ExtensionContext, MicronautJunit5Extension, MicronautTestValue, Store

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class KestraTestExtension(MicronautJunit5Extension):

    def build_micronaut_test_value(self, test_class: type[Any]) -> MicronautTestValue:
        raise NotImplementedError  # TODO: translate from Java

    def get_store(self, context: ExtensionContext) -> ExtensionContext.Store:
        raise NotImplementedError  # TODO: translate from Java

    def has_expected_annotations(self, test_class: type[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def before_all(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def after_test_execution(self, context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

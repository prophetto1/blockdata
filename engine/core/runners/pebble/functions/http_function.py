from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\HttpFunction.java
# WARNING: Unresolved types: DefaultMessageBodyHandlerRegistry, MessageBodyWriter, RequestBody

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class HttpFunction:
    fallback_content_writer: MessageBodyWriter[T]
    name: ClassVar[str] = "http"
    application_context: ApplicationContext | None = None
    default_message_body_handler_registry: DefaultMessageBodyHandlerRegistry | None = None

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def single_value_to_list_for_headers(self, m: dict[str, Any]) -> dict[str, list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def to_request_body(self, args: dict[str, Any], self: PebbleTemplate, line_number: int, content_type: str) -> HttpRequest.RequestBody:
        raise NotImplementedError  # TODO: translate from Java

    def throw_if_missing_args(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

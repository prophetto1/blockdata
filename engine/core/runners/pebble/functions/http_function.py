from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\HttpFunction.java
# WARNING: Unresolved types: ApplicationContext, DefaultMessageBodyHandlerRegistry, EvaluationContext, Function, MessageBodyWriter, PebbleTemplate, RequestBody, T

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class HttpFunction:
    n_a_m_e: ClassVar[str] = "http"
    f_a_l_l_b_a_c_k__c_o_n_t_e_n_t__w_r_i_t_e_r: MessageBodyWriter[T] = (type, mediaType, object, outgoingHeaders, outputStream) -> {
        if (mediaType == MediaType.APPLICATION_YAML_TYPE || mediaType.equals(MediaType.of("application/yaml"))) {
            try {
                outputStream.write(JacksonMapper.ofYaml().writeValueAsString(object).getBytes(StandardCharsets.UTF_8));
                return;
            } catch (IOException e) {
                throw new PebbleException(e, "Couldn't write the request body as YAML");
            }
        }

        throw new PebbleException(new IllegalArgumentException("Unsupported content type: " + mediaType), "Unsupported content type ");
    }
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

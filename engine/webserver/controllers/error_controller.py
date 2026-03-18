from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\ErrorController.java
# WARNING: Unresolved types: ConversionErrorException, FileNotFoundException, IllegalAccessException, InvalidFormatException, JsonError, JsonMappingException, JsonParseException, NoSuchElementException, NoSuchFieldException, UnsatisfiedBodyRouteException, UnsatisfiedQueryValueRouteException

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.exceptions.ai_exception import AiException
from engine.core.exceptions.conflict_exception import ConflictException
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.exceptions.input_output_validation_exception import InputOutputValidationException
from engine.core.exceptions.invalid_exception import InvalidException
from engine.core.exceptions.invalid_query_filters_exception import InvalidQueryFiltersException
from engine.core.exceptions.not_found_exception import NotFoundException
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.exceptions.validation_error_exception import ValidationErrorException


@dataclass(slots=True, kw_only=True)
class ErrorController:
    logger: ClassVar[Logger] = getLogger(__name__)

    def error(self, request: HttpRequest[Any], e: JsonParseException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def path(json_mapping_exception: JsonMappingException) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def not_found(self, request: HttpRequest[Any], e: NoSuchElementException | None = None) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def serialization(self, request: HttpRequest[Any], e: DeserializationException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def http_client(self, request: HttpRequest[Any], e: HttpClientResponseException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def json_error(request: HttpRequest[Any], e: BaseException, status: HttpStatus, reason: str | None = None) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

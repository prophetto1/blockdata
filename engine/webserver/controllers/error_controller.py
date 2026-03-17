from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\ErrorController.java
# WARNING: Unresolved types: ConstraintViolationException, ConversionErrorException, FileNotFoundException, HttpStatus, HttpStatusException, IllegalAccessException, IllegalArgumentException, IllegalStateException, InvalidFormatException, JsonError, JsonMappingException, JsonParseException, NoSuchElementException, NoSuchFieldException, Throwable, UnsatisfiedBodyRouteException, UnsatisfiedQueryValueRouteException

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.exceptions.ai_exception import AiException
from engine.core.exceptions.conflict_exception import ConflictException
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.input_output_validation_exception import InputOutputValidationException
from engine.core.exceptions.invalid_exception import InvalidException
from engine.core.exceptions.invalid_query_filters_exception import InvalidQueryFiltersException
from engine.core.exceptions.not_found_exception import NotFoundException
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.exceptions.validation_error_exception import ValidationErrorException


@dataclass(slots=True, kw_only=True)
class ErrorController:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def error(self, request: HttpRequest[Any], e: JsonParseException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: InputOutputValidationException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: ConversionErrorException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def path(json_mapping_exception: JsonMappingException) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: ConstraintViolationException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: IllegalArgumentException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: AiException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: IllegalStateException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: InvalidFormatException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: UnsatisfiedBodyRouteException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: InvalidException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: NotFoundException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: ConflictException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: InvalidQueryFiltersException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: ValidationErrorException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: HttpStatusException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, request: HttpRequest[Any], e: Throwable) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def not_found(self, request: HttpRequest[Any]) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def not_found(self, request: HttpRequest[Any], e: NoSuchElementException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def not_found(self, request: HttpRequest[Any], e: FileNotFoundException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def not_found(self, request: HttpRequest[Any], e: UnsatisfiedQueryValueRouteException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def serialization(self, request: HttpRequest[Any], e: DeserializationException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def serialization(self, request: HttpRequest[Any], e: ResourceExpiredException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    def http_client(self, request: HttpRequest[Any], e: HttpClientResponseException) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def json_error(json_error: JsonError, status: HttpStatus, reason: str) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def json_error(request: HttpRequest[Any], status: HttpStatus, reason: str) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def json_error(request: HttpRequest[Any], e: Throwable, status: HttpStatus, reason: str) -> HttpResponse[JsonError]:
        raise NotImplementedError  # TODO: translate from Java

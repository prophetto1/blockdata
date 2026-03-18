from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\AbstractSheet.java
# WARNING: Unresolved types: GeneralSecurityException, IOException, Sheets

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSheet(ABC, AbstractTask):
    scopes: Property[list[str]] = Property.ofValue(List.of(SheetsScopes.SPREADSHEETS))

    def connection(self, run_context: RunContext) -> Sheets:
        raise NotImplementedError  # TODO: translate from Java

    def should_retry(self, response: HttpResponse) -> bool:
        raise NotImplementedError  # TODO: translate from Java

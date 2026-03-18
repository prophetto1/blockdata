from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\LibrarySetting.java
# WARNING: Unresolved types: Library, MavenLibrary, PythonPyPiLibrary, RCranLibrary

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LibrarySetting:
    cran: CranSetting | None = None
    egg: Property[str] | None = None
    jar: Property[str] | None = None
    maven: MavenSetting | None = None
    pypi: PypiSetting | None = None
    whl: Property[str] | None = None

    def to_library(self, run_context: RunContext) -> Library:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CranSetting:
        _package: Property[str] | None = None
        repo: Property[str] | None = None

        def to_cran(self, run_context: RunContext) -> RCranLibrary:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MavenSetting:
        coordinates: Property[str] | None = None
        repo: Property[str] | None = None
        exclusions: Property[list[str]] | None = None

        def to_maven(self, run_context: RunContext) -> MavenLibrary:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PypiSetting:
        _package: Property[str] | None = None
        repo: Property[str] | None = None

        def to_pypi(self, run_context: RunContext) -> PythonPyPiLibrary:
            raise NotImplementedError  # TODO: translate from Java

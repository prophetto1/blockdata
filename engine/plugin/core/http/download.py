from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\Download.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.http.abstract_http import AbstractHttp
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractHttp):
    """Download a file over HTTP(S) to Kestra storage."""
    fail_on_empty_response: Property[bool]
    save_as: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filename_from_header(self, run_context: RunContext, content_disposition: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def filename_from_uri(self, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        code: int | None = None
        length: int | None = None
        headers: dict[str, list[str]] | None = None

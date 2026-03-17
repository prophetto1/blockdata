from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextSDKFactory.java
# WARNING: Unresolved types: Auth

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.runners.run_context import RunContext
from engine.core.runners.sdk import SDK


@dataclass(slots=True, kw_only=True)
class RunContextSDKFactory:

    def create(self, application_context: ApplicationContext, run_context: RunContext) -> SDK:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SDKImpl:
        auth_prop: ClassVar[str] = "kestra.tasks.sdk.authentication"
        api_token_prop: ClassVar[str] = AUTH_PROP + ".api-token"
        username_prop: ClassVar[str] = AUTH_PROP + ".username"
        password_prop: ClassVar[str] = AUTH_PROP + ".password"
        sdk_authentication: Auth | None = None

        def default_authentication(self) -> Optional[Auth]:
            raise NotImplementedError  # TODO: translate from Java

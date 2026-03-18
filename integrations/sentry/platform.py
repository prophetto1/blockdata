from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-sentry\src\main\java\io\kestra\plugin\sentry\Platform.java

from enum import Enum
from typing import Any


class Platform(str, Enum):
    AS3 = "AS3"
    C = "C"
    CFML = "CFML"
    COCOA = "COCOA"
    CSHARP = "CSHARP"
    ELIXIR = "ELIXIR"
    HASKELL = "HASKELL"
    GO = "GO"
    GROOVY = "GROOVY"
    JAVA = "JAVA"
    JAVASCRIPT = "JAVASCRIPT"
    NATIVE = "NATIVE"
    NODE = "NODE"
    OBJC = "OBJC"
    OTHER = "OTHER"
    PERL = "PERL"
    PHP = "PHP"
    PYTHON = "PYTHON"
    RUBY = "RUBY"

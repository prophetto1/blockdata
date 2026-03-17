from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\PathMatcherPredicate.java
# WARNING: Unresolved types: PathMatcher, Predicate

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PathMatcherPredicate:
    s_y_n_t_a_x__g_l_o_b: ClassVar[str] = "glob:"
    s_y_n_t_a_x__r_e_g_e_x: ClassVar[str] = "regex:"
    syntax_and_patterns: list[str] | None = None
    matchers: list[PathMatcher] | None = None

    @staticmethod
    def matches(patterns: list[str]) -> PathMatcherPredicate:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def matches(base_path: Path, patterns: list[str]) -> PathMatcherPredicate:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def builder() -> Builder:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def may_add_recursive_match(p: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def syntax_and_patterns(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def test(self, path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def may_add_leading_slash(path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_prefix_with_syntax(pattern: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Builder:
        includes: list[str] = List.of()
        excludes: list[str] = List.of()

        def includes(self, includes: list[str]) -> Builder:
            raise NotImplementedError  # TODO: translate from Java

        def excludes(self, excludes: list[str]) -> Builder:
            raise NotImplementedError  # TODO: translate from Java

        def build(self) -> Predicate[Path]:
            raise NotImplementedError  # TODO: translate from Java

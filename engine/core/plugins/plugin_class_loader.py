from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginClassLoader.java
# WARNING: Unresolved types: Class, ClassLoader, ClassNotFoundException, Enumeration, IOException, Pattern, URLClassLoader

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginClassLoader(URLClassLoader):
    e_x_c_l_u_d_e_s: ClassVar[Pattern] = Pattern.compile("^(?:"
        + "java"
        + "|javax"
        + "|jakarta"
        + "|io.kestra.core"
        + "|io.kestra.plugin.core"
        + "|org.slf4j"
        + "|ch.qos.logback"
        + "|io.swagger"
        + "|com.fasterxml.jackson.core"
        + "|com.fasterxml.jackson.annotation"
        + "|com.fasterxml.jackson.module"
        + "|com.fasterxml.jackson.databind"
        + "|com.fasterxml.jackson.dataformat.ion"
        + "|com.fasterxml.jackson.dataformat.yaml"
        + "|com.fasterxml.jackson.dataformat.xml"
        + "|org.reactivestreams"
        + "|dev.failsafe"
        + "|reactor"
        + "|io.opentelemetry"
        + "|io.netty"
        + ")\\..*$")
    parent: ClassLoader | None = None
    plugin_location: str | None = None

    @staticmethod
    def of(plugin_location: str, urls: list[str], parent: ClassLoader) -> PluginClassLoader:
        raise NotImplementedError  # TODO: translate from Java

    def location(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_class(self, name: str) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def load_class(self, name: str, resolve: bool) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def should_load_from_urls(name: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_resources(self, name: str) -> Enumeration[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_resource(self, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

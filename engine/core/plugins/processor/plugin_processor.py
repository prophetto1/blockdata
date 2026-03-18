from __future__ import annotations

# Source: E:\KESTRA\processor\src\main\java\io\kestra\core\plugins\processor\PluginProcessor.java
# WARNING: Unresolved types: AbstractProcessor, Annotation, AnnotationMirror, Element, Elements, ProcessingEnvironment, RoundEnvironment, SourceVersion, TypeElement, javax, lang, model, util

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.annotations.plugin import Plugin


@dataclass(slots=True, kw_only=True)
class PluginProcessor(AbstractProcessor):
    plugin_resource_file: ClassVar[str]
    exception_stacks: list[str]
    plugins: set[str] = field(default_factory=set)
    element_utils: javax.lang.model.util.Elements | None = None

    def init(self, processing_env: ProcessingEnvironment) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_supported_annotation_types(self) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_supported_source_version(self) -> SourceVersion:
        raise NotImplementedError  # TODO: translate from Java

    def process(self, annotations: set[Any], round_env: RoundEnvironment) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def process_impl(self, annotations: set[Any], round_env: RoundEnvironment) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_annotations(self, annotations: set[Any], round_env: RoundEnvironment) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def generate_plugin_config_files(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_binary_name(self, element: TypeElement) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_binary_name_impl(self, element: TypeElement, class_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_not_abstract(plugin_type: TypeElement) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_no_arg_constructor(self, type_element: TypeElement) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_annotation(self, type_element: TypeElement, annotation_class: type[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def as_type_element(enclosing_element: Element) -> TypeElement:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, msg: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def warning(self, msg: str, element: Element, annotation: AnnotationMirror) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def error(self, msg: str, element: Element, annotation: AnnotationMirror) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fatal_error(self, msg: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

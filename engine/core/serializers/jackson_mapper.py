from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\JacksonMapper.java
# WARNING: Unresolved types: Class, IonSystem, JsonNode, JsonProcessingException, LoaderOptions, ObjectMapper, Pair, T, TypeReference, ZoneId

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JacksonMapper:
    m_a_p__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[dict[str, Any]] = new TypeReference<>() {}
    l_i_s_t__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[list[Any]] = new TypeReference<>() {}
    o_b_j_e_c_t__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[Any] = new TypeReference<>() {}
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.configure(
        new ObjectMapper()
    )
    n_o_n__s_t_r_i_c_t__m_a_p_p_e_r: ObjectMapper = MAPPER
        .copy()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    y_a_m_l__m_a_p_p_e_r: ObjectMapper = JacksonMapper.configure(
        new ObjectMapper(
            YAMLFactory
                .builder()
                .loaderOptions(new LoaderOptions())
                .configure(YAMLGenerator.Feature.MINIMIZE_QUOTES, true)
                .configure(YAMLGenerator.Feature.WRITE_DOC_START_MARKER, false)
                .configure(YAMLGenerator.Feature.USE_NATIVE_TYPE_ID, false)
                .configure(YAMLGenerator.Feature.SPLIT_LINES, false)
                .build()
        )
    )
    i_o_n__m_a_p_p_e_r: ObjectMapper = createIonObjectMapper()

    @staticmethod
    def of_json() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_json(strict: bool) -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_yaml() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(object: Any, zone_id: ZoneId) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(object: Any) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(map: Any, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(json: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_list(json: str) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_list(object: Any) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_object(json: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cast(object: Any, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log(object: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_ion() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure(mapper: ObjectMapper) -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_ion_object_mapper() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_ion_system() -> IonSystem:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_bi_directional_diffs(before: Any, after: Any) -> Pair[JsonNode, JsonNode]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def apply_patches_on_json_node(json_object: JsonNode, patches: list[JsonNode]) -> JsonNode:
        raise NotImplementedError  # TODO: translate from Java

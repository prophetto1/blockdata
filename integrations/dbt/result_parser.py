from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\ResultParser.java
# WARNING: Unresolved types: IOException, ObjectMapper

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.core.models.assets.assets_in_out import AssetsInOut
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.dbt.models.manifest import Manifest
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ResultParser(ABC):
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
        .setSerializationInclusion(JsonInclude.Include.NON_NULL)
    t_a_b_l_e__a_s_s_e_t__t_y_p_e: ClassVar[str] = "io.kestra.plugin.ee.assets.Table"
    r_e_s_o_u_r_c_e__t_y_p_e__m_o_d_e_l: ClassVar[str] = "model"

    @staticmethod
    def parse_manifest_with_assets(run_context: RunContext, file: Path) -> ManifestResult:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_run_result(run_context: RunContext, file: Path, manifest: Manifest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def assets_for(unique_id: str, model_assets: dict[str, ModelAsset]) -> AssetsInOut:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def emit_assets(run_context: RunContext, manifest: Manifest) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def input_identifiers(model_asset: ModelAsset, model_assets: dict[str, ModelAsset]) -> list[AssetIdentifier]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_model_assets(manifest: Manifest) -> dict[str, ModelAsset]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def adapter_type(manifest: Manifest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def asset_id_for(database: str, schema: str, name: str, fallback: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def first_non_blank() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def has_value(value: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ManifestResult:
        manifest: Manifest | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class ModelAsset:
        asset_id: str | None = None
        metadata: dict[str, Any] | None = None
        depends_on: list[str] | None = None

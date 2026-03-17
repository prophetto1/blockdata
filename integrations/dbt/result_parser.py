from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.core.models.assets.assets_in_out import AssetsInOut
from integrations.dbt.models.manifest import Manifest
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ResultParser:
    m_a_p_p_e_r: ObjectMapper | None = None
    t_a_b_l_e__a_s_s_e_t__t_y_p_e: str | None = None
    r_e_s_o_u_r_c_e__t_y_p_e__m_o_d_e_l: str | None = None

    def parse_manifest_with_assets(self, run_context: RunContext, file: Path) -> ManifestResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_run_result(self, run_context: RunContext, file: Path, manifest: Manifest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def assets_for(self, unique_id: str, model_assets: dict[String, ModelAsset]) -> AssetsInOut:
        raise NotImplementedError  # TODO: translate from Java

    def emit_assets(self, run_context: RunContext, manifest: Manifest) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def input_identifiers(self, model_asset: ModelAsset, model_assets: dict[String, ModelAsset]) -> list[AssetIdentifier]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_model_assets(self, manifest: Manifest) -> dict[String, ModelAsset]:
        raise NotImplementedError  # TODO: translate from Java

    def adapter_type(self, manifest: Manifest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def asset_id_for(self, database: str, schema: str, name: str, fallback: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def first_non_blank(self, values: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def has_value(self, value: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

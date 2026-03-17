from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from pathlib import Path

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class ConflictBehavior(str, Enum):
    REPLACE = "REPLACE"
    FAIL = "FAIL"
    RENAME = "RENAME"


@dataclass(slots=True, kw_only=True)
class Upload(AbstractOneShareTask, RunnableTask):
    """Upload file to OneDrive or SharePoint"""
    d_e_f_a_u_l_t__l_a_r_g_e__f_i_l_e__t_h_r_e_s_h_o_l_d: int | None = None
    d_e_f_a_u_l_t__m_a_x__s_l_i_c_e__s_i_z_e: int | None = None
    d_e_f_a_u_l_t__m_a_x__r_e_t_r_y__a_t_t_e_m_p_t_s: int | None = None
    parent_id: Property[str] | None = None
    file_name: Property[str]
    from: Property[str]
    large_file_threshold: Property[int] | None = None
    max_slice_size: Property[int] | None = None
    max_retry_attempts: Property[int] | None = None
    conflict_behavior: Property[ConflictBehavior] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def simple_upload(self, client: GraphServiceClient, file: Path, drive_id: str, parent_id: str, file_name: str, conflict_behavior: ConflictBehavior, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    def resumable_upload(self, client: GraphServiceClient, file: Path, file_size: int, drive_id: str, parent_id: str, file_name: str, max_slice_size: int, max_attempts: int, conflict_behavior: ConflictBehavior, run_context: RunContext, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    def build_item_path(self, parent_id: str, file_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file: OneShareFile | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file: OneShareFile | None = None

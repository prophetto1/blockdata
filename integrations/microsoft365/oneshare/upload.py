from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\Upload.java
# WARNING: Unresolved types: DriveItem, Exception, GraphServiceClient, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, ClassVar

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractOneShareTask):
    """Upload file to OneDrive or SharePoint"""
    file_name: Property[str]
    from: Property[str]
    d_e_f_a_u_l_t__l_a_r_g_e__f_i_l_e__t_h_r_e_s_h_o_l_d: ClassVar[int] = 4 * 1024 * 1024L
    d_e_f_a_u_l_t__m_a_x__s_l_i_c_e__s_i_z_e: ClassVar[int] = 10 * 327680
    d_e_f_a_u_l_t__m_a_x__r_e_t_r_y__a_t_t_e_m_p_t_s: ClassVar[int] = 5
    parent_id: Property[str] = Property.ofValue("root")
    large_file_threshold: Property[int] = Property.ofValue(DEFAULT_LARGE_FILE_THRESHOLD)
    max_slice_size: Property[int] = Property.ofValue(DEFAULT_MAX_SLICE_SIZE)
    max_retry_attempts: Property[int] = Property.ofValue(DEFAULT_MAX_RETRY_ATTEMPTS)
    conflict_behavior: Property[ConflictBehavior] = Property.ofValue(ConflictBehavior.REPLACE)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def simple_upload(self, client: GraphServiceClient, file: Path, drive_id: str, parent_id: str, file_name: str, conflict_behavior: ConflictBehavior, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    def resumable_upload(self, client: GraphServiceClient, file: Path, file_size: int, drive_id: str, parent_id: str, file_name: str, max_slice_size: int, max_attempts: int, conflict_behavior: ConflictBehavior, run_context: RunContext, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    def build_item_path(self, parent_id: str, file_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class ConflictBehavior(str, Enum):
        REPLACE = "REPLACE"
        FAIL = "FAIL"
        RENAME = "RENAME"

    @dataclass(slots=True)
    class Output:
        file: OneShareFile | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\VideoGeneration.java
# WARNING: Unresolved types: Builder, Client, Exception, GenerateVideosConfig, GenerateVideosOperation, GenerateVideosSource, InterruptedException, Video, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar, Optional

from integrations.gemini.abstract_gemini import AbstractGemini
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class VideoGeneration(AbstractGemini):
    """Generate video with Veo via Gemini"""
    prompt: Property[str]
    f_i_l_e__n_a_m_e__t_e_m_p_l_a_t_e: ClassVar[str] = "genai_video_{date}.mp4"
    d_e_f_a_u_l_t__d_u_r_a_t_i_o_n__s_e_c_o_n_d_s: ClassVar[int] = 10
    m_i_n__d_u_r_a_t_i_o_n__s_e_c_o_n_d_s: ClassVar[int] = 1
    m_a_x__d_u_r_a_t_i_o_n__s_e_c_o_n_d_s: ClassVar[int] = 60
    d_e_f_a_u_l_t__p_o_l_l__i_n_t_e_r_v_a_l__m_s: ClassVar[int] = 1_000
    d_e_f_a_u_l_t__t_i_m_e_o_u_t: ClassVar[timedelta] = Duration.ofMinutes(5)
    duration_in_seconds: Property[int] = Property.ofValue(DEFAULT_DURATION_SECONDS)
    include_audio: Property[bool] = Property.ofValue(false)
    timeout: Property[timedelta] = Property.ofValue(DEFAULT_TIMEOUT)
    number_of_videos: Property[int] = Property.ofValue(1)
    vertex_a_i: Property[bool] = Property.ofValue(false)
    negative_prompt: Property[str] | None = None
    seed: Property[int] | None = None
    output_gcs_uri: Property[str] | None = None
    project: Property[str] | None = None
    location: Property[str] | None = None
    download_file_path: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def validate_input_parameters(self, duration: int, download_file_path: str, output_gcs_uri: str, is_vertex_a_i: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_client(self, run_context: RunContext) -> Client:
        raise NotImplementedError  # TODO: translate from Java

    def to_generate_videos_config(self, run_context: RunContext) -> GenerateVideosConfig:
        raise NotImplementedError  # TODO: translate from Java

    def configure_for_vertex_a_i(self, run_context: RunContext, config_builder: GenerateVideosConfig.Builder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_generate_video_source(self, r_prompt: str) -> GenerateVideosSource:
        raise NotImplementedError  # TODO: translate from Java

    def poll_until_complete(self, client: Client, operation: GenerateVideosOperation, timeout_duration: timedelta, run_context: RunContext) -> GenerateVideosOperation:
        raise NotImplementedError  # TODO: translate from Java

    def extract_generated_video(self, operation: GenerateVideosOperation) -> Video:
        raise NotImplementedError  # TODO: translate from Java

    def validate_generated_video(self, video: Video) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def download_video_file(self, client: Client, video_file: Video, run_context: RunContext, r_download_file_path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        video_uri: Optional[str] | None = None
        mime_type: Optional[str] | None = None
        metadata: Optional[dict[str, Any]] | None = None

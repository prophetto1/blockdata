from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\NamespaceFilesUtils.java
# WARNING: Unresolved types: Exception, LinkedBlockingQueue, ThreadFactoryBuilder, ThreadPoolExecutor

from dataclasses import dataclass
from typing import Any

from engine.executor.executor_service import ExecutorService
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class NamespaceFilesUtils:
    max_threads: int = Math.max(Runtime.getRuntime().availableProcessors() * 4, 32)
    e_x_e_c_u_t_o_r__s_e_r_v_i_c_e: ExecutorService = new ThreadPoolExecutor(
        0,
        maxThreads,
        60L,
        TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(),
        new ThreadFactoryBuilder().setNameFormat("namespace-files").build()
    )

    @staticmethod
    def load_namespace_files(run_context: RunContext, namespace_files: NamespaceFiles) -> None:
        raise NotImplementedError  # TODO: translate from Java

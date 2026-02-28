"""Subprocess runner for script-based plugins."""

import asyncio
import os
import tempfile
from dataclasses import dataclass, field
from typing import Any


@dataclass
class RunResult:
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    output_files: dict[str, bytes] = field(default_factory=dict)


async def run_script(
    interpreter: list[str],
    script: str,
    env: dict[str, str] | None = None,
    cwd: str | None = None,
    timeout: float = 300,
    before_commands: list[str] | None = None,
    output_file_patterns: list[str] | None = None,
) -> RunResult:
    """
    Execute a script via subprocess.

    Args:
        interpreter: e.g. ["/bin/bash", "-c"] or ["python3", "-c"]
        script: the script content
        env: additional environment variables
        cwd: working directory
        timeout: seconds before kill
        before_commands: commands to run before the main script
        output_file_patterns: files to capture after execution
    """
    full_env = {**os.environ, **(env or {})}

    # Prepend before_commands if any
    if before_commands:
        full_script = "\n".join(before_commands) + "\n" + script
    else:
        full_script = script

    work_dir = cwd or tempfile.mkdtemp(prefix="pipeline-worker-")

    try:
        proc = await asyncio.create_subprocess_exec(
            *interpreter,
            full_script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env,
            cwd=work_dir,
        )
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
    except asyncio.TimeoutError:
        proc.kill()
        return RunResult(
            exit_code=-1,
            stdout="",
            stderr=f"Script timed out after {timeout}s",
        )

    result = RunResult(
        exit_code=proc.returncode or 0,
        stdout=stdout_bytes.decode("utf-8", errors="replace"),
        stderr=stderr_bytes.decode("utf-8", errors="replace"),
    )

    # Collect output files if requested
    if output_file_patterns:
        import glob

        for pattern in output_file_patterns:
            for filepath in glob.glob(os.path.join(work_dir, pattern)):
                with open(filepath, "rb") as f:
                    rel = os.path.relpath(filepath, work_dir)
                    result.output_files[rel] = f.read()

    return result

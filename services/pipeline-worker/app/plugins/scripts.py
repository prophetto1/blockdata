"""Script execution plugins — Python, Shell, Node, R."""

from typing import Any

from ..shared.base import BasePlugin, PluginOutput
from ..shared import output as out
from ..shared.runner import run_script


class PythonScriptPlugin(BasePlugin):
    """Execute Python scripts. Equivalent to io.kestra.plugin.scripts.python.Script."""

    task_types = [
        "io.kestra.plugin.scripts.python.Script",
        "io.kestra.plugin.scripts.python.Commands",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        script = params.get("script", "")
        commands = params.get("commands", [])
        env = params.get("env", {})
        before = params.get("beforeCommands", [])
        timeout = params.get("timeout", 300)

        # Render templates
        if script:
            script = context.render(script)
        elif commands:
            script = "\n".join(context.render(c) for c in commands)

        env = {k: context.render(str(v)) for k, v in env.items()}

        result = await run_script(
            interpreter=["python3", "-c"],
            script=script,
            env=env,
            timeout=timeout,
            before_commands=before,
            output_file_patterns=params.get("outputFiles", []),
        )

        if result.exit_code != 0:
            return out.failed(
                f"Python script exited with code {result.exit_code}: {result.stderr}",
                data={"exitCode": result.exit_code, "stdout": result.stdout, "stderr": result.stderr},
            )

        return out.success(
            data={"exitCode": 0, "stdout": result.stdout, "stderr": result.stderr},
            logs=[f"Python script completed ({len(result.stdout)} bytes output)"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "script", "type": "string", "required": False, "description": "Python script content."},
            {"name": "commands", "type": "array", "required": False, "description": "List of shell commands to run."},
            {"name": "env", "type": "object", "required": False, "description": "Environment variables."},
            {"name": "beforeCommands", "type": "array", "required": False, "description": "Commands to run before script (e.g. pip install)."},
            {"name": "timeout", "type": "integer", "required": False, "default": 300, "description": "Timeout in seconds."},
            {"name": "outputFiles", "type": "array", "required": False, "description": "Glob patterns for output files to capture."},
        ]


class ShellScriptPlugin(BasePlugin):
    """Execute Shell/Bash scripts. Equivalent to io.kestra.plugin.scripts.shell.Script."""

    task_types = [
        "io.kestra.plugin.scripts.shell.Script",
        "io.kestra.plugin.scripts.shell.Commands",
        "io.kestra.core.tasks.scripts.Bash",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        script = params.get("script", "")
        commands = params.get("commands", [])
        env = params.get("env", {})
        interpreter = params.get("interpreter", ["/bin/bash", "-c"])
        timeout = params.get("timeout", 300)

        if script:
            script = context.render(script)
        elif commands:
            script = "\n".join(context.render(c) for c in commands)

        env = {k: context.render(str(v)) for k, v in env.items()}

        result = await run_script(
            interpreter=interpreter,
            script=script,
            env=env,
            timeout=timeout,
            before_commands=params.get("beforeCommands", []),
            output_file_patterns=params.get("outputFiles", []),
        )

        if result.exit_code != 0:
            return out.failed(
                f"Shell script exited with code {result.exit_code}: {result.stderr}",
                data={"exitCode": result.exit_code, "stdout": result.stdout, "stderr": result.stderr},
            )

        return out.success(
            data={"exitCode": 0, "stdout": result.stdout, "stderr": result.stderr},
            logs=[f"Shell script completed ({len(result.stdout)} bytes output)"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "script", "type": "string", "required": False, "description": "Shell script content."},
            {"name": "commands", "type": "array", "required": False, "description": "List of commands to run."},
            {"name": "interpreter", "type": "array", "required": False, "default": ["/bin/bash", "-c"], "description": "Interpreter command."},
            {"name": "env", "type": "object", "required": False, "description": "Environment variables."},
            {"name": "timeout", "type": "integer", "required": False, "default": 300, "description": "Timeout in seconds."},
        ]


class NodeScriptPlugin(BasePlugin):
    """Execute Node.js scripts. Equivalent to io.kestra.plugin.scripts.node.Script."""

    task_types = [
        "io.kestra.plugin.scripts.node.Script",
        "io.kestra.plugin.scripts.node.Commands",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        script = params.get("script", "")
        commands = params.get("commands", [])
        env = params.get("env", {})
        timeout = params.get("timeout", 300)

        if script:
            script = context.render(script)
        elif commands:
            script = "\n".join(context.render(c) for c in commands)

        env = {k: context.render(str(v)) for k, v in env.items()}

        result = await run_script(
            interpreter=["node", "-e"],
            script=script,
            env=env,
            timeout=timeout,
            before_commands=params.get("beforeCommands", []),
        )

        if result.exit_code != 0:
            return out.failed(
                f"Node script exited with code {result.exit_code}: {result.stderr}",
                data={"exitCode": result.exit_code, "stdout": result.stdout, "stderr": result.stderr},
            )

        return out.success(
            data={"exitCode": 0, "stdout": result.stdout, "stderr": result.stderr},
            logs=[f"Node script completed ({len(result.stdout)} bytes output)"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "script", "type": "string", "required": False, "description": "Node.js script content."},
            {"name": "commands", "type": "array", "required": False, "description": "List of commands to run."},
            {"name": "env", "type": "object", "required": False, "description": "Environment variables."},
            {"name": "timeout", "type": "integer", "required": False, "default": 300, "description": "Timeout in seconds."},
        ]

import json
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
START_SCRIPT = REPO_ROOT / "scripts" / "start-platform-api.ps1"
CONTROL_SCRIPT = REPO_ROOT / "scripts" / "platform-api-dev-control.ps1"
PACKAGE_JSON = REPO_ROOT / "package.json"


def _extract_function_block(script_text: str, function_name: str) -> str:
    marker = f"function {function_name} {{"
    start = script_text.index(marker)
    brace_depth = 0
    body_start = script_text.index("{", start)

    for index in range(body_start, len(script_text)):
        char = script_text[index]
        if char == "{":
            brace_depth += 1
        elif char == "}":
            brace_depth -= 1
            if brace_depth == 0:
                return script_text[start : index + 1]

    raise AssertionError(f"Unable to extract function {function_name}")


def test_windows_start_dev_script_writes_managed_state_metadata() -> None:
    script_text = START_SCRIPT.read_text(encoding="utf-8")

    assert ".codex-tmp" in script_text
    assert "platform-api-dev" in script_text
    assert "state.json" in script_text
    assert "ConvertTo-Json" in script_text


def test_root_package_json_exposes_platform_api_recover_script() -> None:
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

    assert "platform-api:recover" in package.get("scripts", {})
    assert "platform-api-dev-control.ps1" in package["scripts"]["platform-api:recover"]
    assert "recover" in package["scripts"]["platform-api:recover"]


def test_root_package_json_exposes_platform_api_ensure_and_dev_scripts() -> None:
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

    assert "platform-api:ensure" in package.get("scripts", {})
    assert "ensure-platform-api.ps1" in package["scripts"]["platform-api:ensure"]
    assert "dev" in package["scripts"]
    assert "npm --workspace web run dev" == package["scripts"]["dev"]


def test_platform_api_dev_control_script_declares_fixed_status_and_recover_actions() -> None:
    script_text = CONTROL_SCRIPT.read_text(encoding="utf-8")

    assert CONTROL_SCRIPT.exists(), "Dev recovery should have a dedicated PowerShell control script"
    assert "param(" in script_text
    assert "ValidateSet" in script_text
    assert "status" in script_text
    assert "recover" in script_text


def test_platform_api_dev_control_script_reuses_bootstrap_script_without_generic_eval() -> None:
    script_text = CONTROL_SCRIPT.read_text(encoding="utf-8")

    assert "start-platform-api.ps1" in script_text
    assert "-NoReload" in script_text
    assert "/health" in script_text
    assert "/health/ready" in script_text
    assert "Invoke-Expression" not in script_text


def test_platform_api_ensure_script_checks_status_before_recovering() -> None:
    ensure_script = REPO_ROOT / "scripts" / "ensure-platform-api.ps1"
    script_text = ensure_script.read_text(encoding="utf-8")

    assert ensure_script.exists(), "One-command dev startup should have a dedicated ensure script"
    assert "platform-api-dev-control.ps1" in script_text
    assert "-Action status" in script_text
    assert "-Action recover" in script_text
    assert "ConvertFrom-Json" in script_text
    assert "-join [Environment]::NewLine" in script_text


def test_get_stop_target_ids_handles_single_listener_pid_without_method_errors() -> None:
    script_text = CONTROL_SCRIPT.read_text(encoding="utf-8")
    function_text = _extract_function_block(script_text, "Get-StopTargetIds")
    powershell = "\n".join(
        [
            "$ErrorActionPreference = 'Stop'",
            function_text,
            "function Get-CimInstance { return @() }",
            "$listener = @{ running = $true; pid = 1234 }",
            "$result = Get-StopTargetIds -Listener $listener -State $null",
            "[string]::Join(',', @($result))",
        ]
    )

    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", powershell],
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr or completed.stdout
    assert completed.stdout.strip() == "1234"


def test_get_listener_record_falls_back_to_netstat_when_tcp_query_is_denied() -> None:
    script_text = CONTROL_SCRIPT.read_text(encoding="utf-8")
    helper_text = _extract_function_block(script_text, "Get-NetstatListenerOwningProcessId")
    function_text = _extract_function_block(script_text, "Get-ListenerRecord")
    powershell = "\n".join(
        [
            "$ErrorActionPreference = 'Stop'",
            "$Port = 8000",
            helper_text,
            function_text,
            "function Get-NetTCPConnection { throw 'Access denied' }",
            "function netstat { '  TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       11408' }",
            "function Get-ProcessRecord { param([int]$ProcessId) return [ordered]@{ pid = $ProcessId; started_at = $null; command_line = 'python -m uvicorn app.main:app'; parent_pid = 9108 } }",
            "$result = Get-ListenerRecord",
            "$result | ConvertTo-Json -Compress",
        ]
    )

    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", powershell],
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr or completed.stdout
    payload = json.loads(completed.stdout)
    assert payload["running"] is True
    assert payload["pid"] == 11408

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
START_SCRIPT = REPO_ROOT / "scripts" / "start-platform-api.ps1"
CONTROL_SCRIPT = REPO_ROOT / "scripts" / "platform-api-dev-control.ps1"
PACKAGE_JSON = REPO_ROOT / "package.json"


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
    assert "/health" in script_text
    assert "/health/ready" in script_text
    assert "Invoke-Expression" not in script_text

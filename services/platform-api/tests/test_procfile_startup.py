import json
from pathlib import Path


def test_procfile_points_cloud_run_to_fastapi_app() -> None:
    procfile = Path(__file__).resolve().parents[1] / "Procfile"

    assert procfile.exists(), "Cloud Run source deploy needs a Procfile override for app.main:app"
    assert "app.main:app" in procfile.read_text(encoding="utf-8")


def test_deploy_script_sets_app_secret_envelope_key() -> None:
    deploy_script = Path(__file__).resolve().parents[3] / "scripts" / "deploy-cloud-run-platform-api.ps1"
    script_text = deploy_script.read_text(encoding="utf-8")

    assert "APP_SECRET_ENVELOPE_KEY" in script_text
    assert "app-secret-envelope-key" in script_text


def test_deploy_script_owns_otel_contract() -> None:
    """Deploy script must emit the complete OTEL config set on every deploy."""
    deploy_script = Path(__file__).resolve().parents[3] / "scripts" / "deploy-cloud-run-platform-api.ps1"
    script_text = deploy_script.read_text(encoding="utf-8")

    # First-class OTEL parameters declared
    for param in [
        "$OtelEnabled",
        "$OtelServiceName",
        "$OtelServiceNamespace",
        "$OtelDeploymentEnv",
        "$OtelExporterOtlpEndpoint",
        "$OtelExporterOtlpProtocol",
        "$OtelLogCorrelation",
        "$OtelMetricsEnabled",
        "$OtelLogsEnabled",
        "$SignozUiUrl",
        "$JaegerUiUrl",
        "$OtelHeadersSecretName",
        "$UseExistingOtelHeadersSecret",
    ]:
        assert param in script_text, f"Deploy script missing OTEL parameter: {param}"

    # OTEL env vars wired into Cloud Run env
    for env_var in [
        "OTEL_ENABLED=",
        "OTEL_SERVICE_NAME=",
        "OTEL_SERVICE_NAMESPACE=",
        "OTEL_DEPLOYMENT_ENV=",
        "OTEL_EXPORTER_OTLP_ENDPOINT=",
        "OTEL_EXPORTER_OTLP_PROTOCOL=",
        "OTEL_LOG_CORRELATION=",
        "OTEL_METRICS_ENABLED=",
        "OTEL_LOGS_ENABLED=",
    ]:
        assert env_var in script_text, f"Deploy script missing OTEL env wiring: {env_var}"

    # Secret-backed OTLP headers support
    assert "OTEL_EXPORTER_OTLP_HEADERS=" in script_text


def test_windows_start_dev_script_loads_root_env_and_runs_uvicorn() -> None:
    script_path = Path(__file__).resolve().parents[3] / "scripts" / "start-platform-api.ps1"
    script_text = script_path.read_text(encoding="utf-8")

    assert script_path.exists(), "Windows dev startup should have a dedicated PowerShell launcher"
    assert ".env" in script_text
    assert "services\\platform-api" in script_text or "services/platform-api" in script_text
    assert "uvicorn" in script_text
    assert "app.main:app" in script_text


def test_windows_start_dev_script_declares_param_block_before_executable_statements() -> None:
    script_path = Path(__file__).resolve().parents[3] / "scripts" / "start-platform-api.ps1"
    lines = script_path.read_text(encoding="utf-8").splitlines()

    first_meaningful = next(
        (line.strip() for line in lines if line.strip() and not line.strip().startswith("#")),
        "",
    )

    assert first_meaningful.startswith("param("), "PowerShell launcher must declare param() before executable statements"


def test_windows_start_dev_script_avoids_reserved_host_parameter_name() -> None:
    script_path = Path(__file__).resolve().parents[3] / "scripts" / "start-platform-api.ps1"
    script_text = script_path.read_text(encoding="utf-8")

    assert "[string]$Host" not in script_text


def test_root_package_json_exposes_platform_api_dev_script() -> None:
    package_json = Path(__file__).resolve().parents[3] / "package.json"
    package = json.loads(package_json.read_text(encoding="utf-8"))

    assert "platform-api:dev" in package.get("scripts", {})
    assert "start-platform-api.ps1" in package["scripts"]["platform-api:dev"]

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.domain.plugins.registry import discover_plugins, FUNCTION_NAME_MAP
from app.core.reserved_routes import check_collisions
from app.observability import configure_telemetry, shutdown_telemetry
from app.workers.conversion_pool import init_pool, shutdown_pool
from app.workers.pipeline_jobs import start_pipeline_jobs_worker, stop_pipeline_jobs_worker
from app.workers.storage_cleanup import start_storage_cleanup_worker, stop_storage_cleanup_worker

_logging_configured = False


class _OtelDefaultsFilter(logging.Filter):
    """Inject default otelTraceID/otelSpanID when not set by OTel instrumentation."""

    def filter(self, record):
        if not hasattr(record, "otelTraceID"):
            record.otelTraceID = "0"
        if not hasattr(record, "otelSpanID"):
            record.otelSpanID = "0"
        return True


def configure_logging(settings) -> None:
    """Set up root logger with trace-correlated format. Safe to call multiple times."""
    global _logging_configured
    if _logging_configured:
        return
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    # Remove any existing handlers (e.g. from earlier basicConfig calls)
    for h in root.handlers[:]:
        root.removeHandler(h)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(name)s %(levelname)s [trace=%(otelTraceID)s span=%(otelSpanID)s] %(message)s"
    ))
    handler.addFilter(_OtelDefaultsFilter())
    root.addHandler(handler)
    _logging_configured = True


logger = logging.getLogger("platform-api")


def _can_start_supabase_workers(settings) -> bool:
    if settings.supabase_url and settings.supabase_service_role_key:
        return True

    logger.warning(
        "Skipping background workers because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
    )
    return False


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        discover_plugins()
        check_collisions(set(FUNCTION_NAME_MAP.keys()))
        count = len(FUNCTION_NAME_MAP)
        logger.info(f"Discovered {count} plugin functions. Collision check passed.")

        # Initialize conversion process pool
        pool = init_pool()
        logger.info(f"Conversion pool: {pool.status()}")

        # Start storage cleanup worker
        if _can_start_supabase_workers(settings):
            start_storage_cleanup_worker()
            start_pipeline_jobs_worker()

        yield

        # Shutdown background workers gracefully
        stop_pipeline_jobs_worker()
        stop_storage_cleanup_worker()
        shutdown_pool()
        # Flush any pending telemetry spans
        telem_state = getattr(app.state, "telemetry", None)
        if telem_state:
            shutdown_telemetry(telem_state)
        logger.info("Conversion pool shut down.")

    app = FastAPI(title="Platform API", lifespan=lifespan)

    # Bootstrap OpenTelemetry (idempotent, no-ops when OTEL_ENABLED=false)
    app.state.telemetry = configure_telemetry(app, settings)

    # Auth middleware for /convert and /citations â€” runs BEFORE body parsing
    from app.auth.middleware import AuthBeforeBodyMiddleware
    app.add_middleware(AuthBeforeBodyMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.auth_redirect_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Route mounting order matters! ---
    # 1. Health routes (no auth)
    from app.api.routes.health import router as health_router
    app.include_router(health_router)

    # 2. Conversion and citations (middleware handles pre-body auth,
    #    Depends(require_auth) still runs for JWT validation + role assignment)
    from app.api.routes.conversion import router as conversion_router
    app.include_router(conversion_router)

    # 3. Admin routes (platform_admin role required)
    from app.api.routes.admin_services import router as admin_router
    app.include_router(admin_router)
    from app.api.routes.admin_storage import router as admin_storage_router
    app.include_router(admin_storage_router)
    from app.api.routes.admin_runtime_readiness import router as admin_runtime_readiness_router
    app.include_router(admin_runtime_readiness_router)

    # 4. Future /api/v1/* routes (stubs)
    from app.api.routes.crews import router as crews_router
    from app.api.routes.embeddings import router as embeddings_router
    from app.api.routes.jobs import router as jobs_router
    app.include_router(crews_router)
    app.include_router(embeddings_router)
    app.include_router(jobs_router)

    # 5. Functions listing
    from app.api.routes.functions import router as functions_router
    app.include_router(functions_router)

    # 5b. Connection management (user-scoped, before plugin catch-all)
    from app.api.routes.connections import router as connections_router
    app.include_router(connections_router)

    # 5c. Load orchestration (user-scoped, before plugin catch-all)
    from app.api.routes.load_runs import router as load_runs_router
    app.include_router(load_runs_router)

    # 5d. Parse orchestration (user-scoped, before plugin catch-all)
    try:
        from app.api.routes.parse import router as parse_router
        app.include_router(parse_router)
    except ImportError as e:
        logger.warning(f"Parse route disabled â€” missing dependency: {e}")

    # 5e. Storage quota and uploads (user-scoped, before plugin catch-all)
    from app.api.routes.storage import router as storage_router
    app.include_router(storage_router)

    # 5f. Pipeline services routes (user-scoped, before plugin catch-all)
    from app.api.routes.pipelines import router as pipelines_router
    app.include_router(pipelines_router)

    # 5g. Observability endpoints (superuser, before plugin catch-all)
    from app.api.routes.telemetry import router as telemetry_router
    app.include_router(telemetry_router)

    # 5h. User variables (user-scoped, before plugin catch-all)
    from app.api.routes.variables import router as variables_router
    app.include_router(variables_router)

    # 5h2. Canonical secrets surface (user-scoped, before plugin catch-all)
    from app.api.routes.secrets import router as secrets_router
    app.include_router(secrets_router)

    # 5i. OAuth observability endpoints (anonymous + superuser, before plugin catch-all)
    from app.api.routes.auth_oauth import router as auth_oauth_router
    app.include_router(auth_oauth_router)

    # 5j. AG chain model registry (user + superuser, before plugin catch-all)
    from app.api.routes.agchain_models import router as agchain_models_router
    app.include_router(agchain_models_router)

    # 5k. AG chain benchmark catalog (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_benchmarks import router as agchain_benchmarks_router
    app.include_router(agchain_benchmarks_router)

    # 6. Plugin catch-all MUST be last
    from app.api.routes.plugin_execution import router as plugin_router
    app.include_router(plugin_router)

    return app


app = create_app()

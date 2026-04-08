from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.services.runtime_probe_service import (
    load_runtime_action_run,
    load_runtime_probe_run,
)

router = APIRouter(prefix="/admin/runtime", tags=["admin-runtime-actions"])


@router.get("/probe-runs/{probe_run_id}", openapi_extra={"x-required-role": "platform_admin"})
async def get_runtime_probe_run_route(
    probe_run_id: str,
    _auth: AuthPrincipal = Depends(require_superuser),
):
    try:
        return load_runtime_probe_run(probe_run_id=probe_run_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/action-runs/{action_run_id}", openapi_extra={"x-required-role": "platform_admin"})
async def get_runtime_action_run_route(
    action_run_id: str,
    _auth: AuthPrincipal = Depends(require_superuser),
):
    try:
        return load_runtime_action_run(action_run_id=action_run_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

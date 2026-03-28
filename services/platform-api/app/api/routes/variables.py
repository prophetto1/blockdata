"""Deprecated compatibility aliases for the canonical /secrets surface."""

from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field, model_validator

from app.api.routes.secrets import (
    CreateSecretRequest,
    SecretValueKind,
    UpdateSecretRequest,
    create_secret,
    delete_secret,
    list_secrets,
    update_secret,
)
from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal

router = APIRouter(prefix="/variables", tags=["variables"])


def _apply_deprecation_headers(response: Response) -> None:
    response.headers["Deprecation"] = "true"
    response.headers["X-Replaced-By"] = "/secrets"


class VariableMetadata(BaseModel):
    id: str
    name: str
    description: str | None = None
    value_kind: str
    value_suffix: str | None = None
    created_at: str
    updated_at: str


class ListVariablesResponse(BaseModel):
    variables: list[VariableMetadata]


class VariableResponse(BaseModel):
    variable: VariableMetadata


class CreateVariableRequest(BaseModel):
    name: str = Field(min_length=1)
    value: str
    description: str | None = None
    value_kind: SecretValueKind = Field(default="secret")


class UpdateVariableRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    value: str | None = None
    description: str | None = None
    value_kind: SecretValueKind | None = None

    @model_validator(mode="after")
    def validate_non_empty(self) -> "UpdateVariableRequest":
        if not any(
            value is not None
            for value in (self.name, self.value, self.description, self.value_kind)
        ):
            raise ValueError("At least one field must be provided")
        return self


class DeleteVariableResponse(BaseModel):
    ok: Literal[True]
    id: str


@router.get(
    "",
    response_model=ListVariablesResponse,
    summary="Deprecated compatibility alias for listing current user secrets",
    deprecated=True,
)
async def list_variables(
    response: Response,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    _apply_deprecation_headers(response)
    result = await list_secrets(auth)
    return {"variables": result["secrets"]}


@router.post(
    "",
    response_model=VariableResponse,
    summary="Deprecated compatibility alias for creating a user secret",
    deprecated=True,
)
async def create_variable(
    body: CreateVariableRequest,
    response: Response,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    _apply_deprecation_headers(response)
    result = await create_secret(
        CreateSecretRequest(
            name=body.name,
            value=body.value,
            description=body.description,
            value_kind=body.value_kind,
        ),
        auth,
    )
    return {"variable": result["secret"]}


@router.patch(
    "/{variable_id}",
    response_model=VariableResponse,
    summary="Deprecated compatibility alias for updating a user secret",
    deprecated=True,
)
async def update_variable(
    variable_id: str,
    body: UpdateVariableRequest,
    response: Response,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    _apply_deprecation_headers(response)
    result = await update_secret(
        variable_id,
        UpdateSecretRequest(
            name=body.name,
            value=body.value,
            description=body.description,
            value_kind=body.value_kind,
        ),
        auth,
    )
    return {"variable": result["secret"]}


@router.delete(
    "/{variable_id}",
    response_model=DeleteVariableResponse,
    summary="Deprecated compatibility alias for deleting a user secret",
    deprecated=True,
)
async def delete_variable(
    variable_id: str,
    response: Response,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    _apply_deprecation_headers(response)
    return await delete_secret(variable_id, auth)

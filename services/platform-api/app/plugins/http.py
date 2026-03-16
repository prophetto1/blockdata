"""HTTP plugins — Request, Download.

Uses substrate: resolve_auth for authentication, context.render for templates,
context.upload_file for storage. No legacy auth module.
"""
from typing import Any

import httpx

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out
from app.infra.auth_providers import resolve_auth


class HttpRequestPlugin(BasePlugin):
    """HTTP request. Equivalent to io.kestra.plugin.core.http.Request."""

    task_types = [
        "io.kestra.plugin.core.http.Request",
        "io.kestra.core.tasks.http.Request",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        uri = context.render(str(params.get("uri", "")))
        method = params.get("method", "GET").upper()
        headers = params.get("headers", {})
        body = params.get("body")
        form_data = params.get("formData")
        timeout = params.get("timeout", 30)
        max_response_size = params.get("maxResponseSize", 10 * 1024 * 1024)  # 10MB

        # Render template expressions in headers
        rendered_headers = {k: context.render(str(v)) for k, v in headers.items()}

        # Auth handling via substrate
        auth_config = params.get("auth")
        if auth_config:
            auth_type = auth_config.get("type", "").upper()
            if auth_type == "BASIC":
                auth_result = await resolve_auth(
                    {"username": auth_config.get("username", ""),
                     "password": auth_config.get("password", "")},
                    auth_type="basic",
                )
                rendered_headers.update(auth_result.headers)
            elif auth_type == "BEARER":
                auth_result = await resolve_auth(
                    {"api_key": auth_config.get("token", "")},
                    auth_type="api_key",
                )
                rendered_headers.update(auth_result.headers)
            elif auth_type == "API_KEY":
                header_name = auth_config.get("header", "Authorization")
                rendered_headers[header_name] = auth_config.get("value", "")

        # Build request kwargs
        kwargs: dict[str, Any] = {
            "method": method,
            "url": uri,
            "headers": rendered_headers,
            "timeout": timeout,
        }

        if body and method in ("POST", "PUT", "PATCH"):
            if isinstance(body, str):
                kwargs["content"] = context.render(body)
            else:
                kwargs["json"] = body

        if form_data:
            kwargs["data"] = {k: context.render(str(v)) for k, v in form_data.items()}

        context.logger.info(f"HTTP {method} {uri}")

        async with httpx.AsyncClient() as client:
            resp = await client.request(**kwargs)

        # Truncate response body if too large
        response_body = resp.text
        if len(response_body) > max_response_size:
            response_body = response_body[:max_response_size] + "...[truncated]"

        data = {
            "statusCode": resp.status_code,
            "headers": dict(resp.headers),
            "body": response_body,
            "uri": str(resp.url),
        }

        state = "SUCCESS" if resp.status_code < 400 else "WARNING"
        return PluginOutput(
            state=state,
            data=data,
            logs=[f"HTTP {method} {uri} → {resp.status_code}"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "uri", "type": "string", "required": True, "description": "URL to request. Supports {{ expressions }}."},
            {"name": "method", "type": "string", "required": False, "default": "GET", "values": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]},
            {"name": "headers", "type": "object", "required": False, "description": "Request headers."},
            {"name": "body", "type": "string", "required": False, "description": "Request body for POST/PUT/PATCH."},
            {"name": "formData", "type": "object", "required": False, "description": "Form data (application/x-www-form-urlencoded)."},
            {"name": "auth", "type": "object", "required": False, "description": "Auth config: {type: BASIC|BEARER|API_KEY, username, password, token, header, value}"},
            {"name": "timeout", "type": "integer", "required": False, "default": 30, "description": "Request timeout in seconds."},
        ]


class HttpDownloadPlugin(BasePlugin):
    """Download a file. Equivalent to io.kestra.plugin.core.http.Download."""

    task_types = [
        "io.kestra.plugin.core.http.Download",
        "io.kestra.core.tasks.http.Download",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        uri = context.render(str(params.get("uri", "")))
        headers = params.get("headers", {})
        rendered_headers = {k: context.render(str(v)) for k, v in headers.items()}

        context.logger.info(f"Downloading {uri}")

        async with httpx.AsyncClient() as client:
            resp = await client.get(uri, headers=rendered_headers, timeout=120)
            resp.raise_for_status()

        content_type = resp.headers.get("content-type", "application/octet-stream")
        size = len(resp.content)

        # Upload to storage if configured
        if context.supabase_url and context.supabase_key:
            filename = uri.split("/")[-1].split("?")[0] or "download"
            storage_path = f"downloads/{context.execution_id}/{filename}"
            storage_url = await context.upload_file("pipeline", storage_path, resp.content)
            return out.success(
                data={"uri": storage_url, "contentType": content_type, "size": size},
                logs=[f"Downloaded {uri} ({size} bytes) → {storage_url}"],
            )

        return out.success(
            data={"uri": uri, "contentType": content_type, "size": size},
            logs=[f"Downloaded {uri} ({size} bytes)"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "uri", "type": "string", "required": True, "description": "URL to download."},
            {"name": "headers", "type": "object", "required": False, "description": "Request headers."},
        ]

# Python Bundle: `_view`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `9`

## Files

- `_view/__init__.py`
- `_view/azure.py`
- `_view/common.py`
- `_view/fastapi_prereqs.py`
- `_view/fastapi_server.py`
- `_view/notify.py`
- `_view/schema.py`
- `_view/server.py`
- `_view/view.py`

## `_view/__init__.py`

```python

```

## `_view/azure.py`

```python
"""Azure-specific helpers used across Inspect view components."""

import os
from typing import Any, Callable

from inspect_ai._util.azure import is_azure_path

_AZURE_AUTH_KEYWORDS = (
    "authenticate",
    "noauthenticationinformation",
    "authenticationfailed",
)


def azure_debug_exists(fs: Any, path: str, printer: Callable[[str], None]) -> None:
    """Emit optional debugging information for Azure existence checks."""
    if not (is_azure_path(path) and os.getenv("INSPECT_AZURE_DEBUG")):
        return
    try:
        exists = fs.exists(path)
        printer(f"[azure-debug] exists({path}) -> {exists}")
    except Exception as ex:  # noqa: BLE001
        printer(f"[azure-debug] exists() raised: {ex}")


def azure_runtime_hint(error: Exception) -> str:
    """Standard message guiding users when Azure auth fails."""
    return (
        "Azure storage authentication failed. Try: (a) 'az login' or ensure role "
        "assignment (Storage Blob Data Reader/Contributor), or (b) supply SAS via "
        "AZURE_STORAGE_SAS_TOKEN. If using az:// ensure AZURE_STORAGE_ACCOUNT_NAME is set. "
        f"Original error: {error}"
    )


def should_suppress_azure_error(path: str, error: Exception) -> bool:
    """Return True if an Azure auth issue should be downgraded to a warning."""
    if not is_azure_path(path):
        return False
    lowered = str(error).lower()
    return any(keyword in lowered for keyword in _AZURE_AUTH_KEYWORDS)


def azure_warning_hint(path: str, error: Exception) -> str:
    """Diagnostic guidance for Azure listing/authentication issues."""
    return (
        "Azure storage authentication failed while probing "
        f"'{path}'. Suppressed stack trace. Guidance: (a) run 'az login' or ensure role "
        "assignment (Storage Blob Data Reader/Contributor); (b) if using SAS set "
        "AZURE_STORAGE_SAS_TOKEN (and AZURE_STORAGE_ACCOUNT_NAME if needed); (c) if using account "
        f"key, set AZURE_STORAGE_ACCOUNT_KEY. Original error: {error}"
    )


def normalize_azure_listing_name(log_dir: str, candidate: str) -> str:
    """Normalize abfs* URIs to az:// when the log dir uses az://."""
    if log_dir.startswith("az://") and candidate.startswith(("abfs://", "abfss://")):
        without_scheme = candidate.split("://", 1)[1]
        return f"az://{without_scheme}"
    return candidate
```

## `_view/common.py`

```python
import asyncio
import contextlib
import inspect
import os
import urllib.parse
from collections.abc import AsyncIterable
from io import BytesIO
from logging import getLogger
from typing import Any, AsyncIterator, Literal, Tuple, cast

import fsspec  # type: ignore
from aiobotocore.response import StreamingBody
from fsspec.asyn import AsyncFileSystem  # type: ignore
from fsspec.core import split_protocol  # type: ignore
from s3fs import S3FileSystem  # type: ignore
from s3fs.core import _error_wrapper, version_id_kw  # type: ignore

from inspect_ai._util.file import default_fs_options, dirname, filesystem, size_in_mb
from inspect_ai._view.azure import (
    azure_warning_hint,
    normalize_azure_listing_name,
    should_suppress_azure_error,
)
from inspect_ai.log._file import (
    EvalLogInfo,
    eval_log_json,
    is_log_file,
    list_eval_logs,
    log_file_info,
    log_files_from_ls,
    read_eval_log_async,
)

logger = getLogger(__name__)


def normalize_uri(uri: str) -> str:
    """Normalize incoming URIs to a consistent format."""
    # Decode any URL-encoded characters
    parsed = urllib.parse.urlparse(urllib.parse.unquote(uri))

    if parsed.scheme != "file":
        # If this isn't a file uri, just unquote it
        return urllib.parse.unquote(uri)

    else:
        # If this is a file uri, see whether we should process triple slashes
        # down to double slashes
        path = parsed.path

        # Detect and normalize Windows-style file URIs
        if path.startswith("/") and len(path) > 3 and path[2] == ":":
            # Strip leading `/` before drive letter
            path = path[1:]

        return f"file://{path}"


def get_log_dir(log_dir: str) -> dict[str, Any]:
    response = dict(
        log_dir=aliased_path(log_dir),
    )
    return response


async def get_log_files(
    request_log_dir: str,
    recursive: bool,
    fs_options: dict[str, Any],
    mtime: float,
    file_count: int,
) -> dict[str, Any]:
    # list logs
    logs = await list_eval_logs_async(
        log_dir=request_log_dir, recursive=recursive, fs_options=fs_options
    )

    if len(logs) != file_count:
        # Has the number of files changed? could be a delete
        # so send a complete list
        return log_files_response(
            logs, response_type="full", base_log_dir=request_log_dir
        )
    else:
        # send only the changed files (captures edits)
        logs = [log for log in logs if (log.mtime is None or log.mtime > mtime)]
        return log_files_response(
            logs, response_type="incremental", base_log_dir=request_log_dir
        )


def parse_log_token(log_token: str) -> Tuple[float, int]:
    # validate basic format
    if log_token.find("-") == -1:
        raise RuntimeError(f"Invalid log token: {log_token}")

    # strip weak etag markers if present
    if log_token.startswith('W/"') and log_token.endswith('"'):
        log_token = log_token[3:-1]

    parts = log_token.split("-", 1)
    return float(parts[0]), int(parts[1])


def log_files_response(
    logs: list[EvalLogInfo],
    response_type: Literal["incremental", "full"],
    base_log_dir: str | None = None,
) -> dict[str, Any]:
    response = dict(
        response_type=response_type,
        files=[
            dict(
                name=_normalize_listing_name(base_log_dir, log.name),
                size=log.size,
                mtime=log.mtime,
                task=log.task,
                task_id=log.task_id,
            )
            for log in logs
        ],
    )
    return response


async def get_log_file(file: str, header_only_param: str | None) -> bytes:
    # resolve header_only
    header_only_mb = int(header_only_param) if header_only_param is not None else None
    header_only = resolve_header_only(file, header_only_mb)

    contents: bytes | None = None
    if header_only:
        try:
            log = await read_eval_log_async(file, header_only=True)
            contents = eval_log_json(log)
        except ValueError as ex:
            logger.info(
                f"Unable to read headers from log file {file}: {ex}. "
                + "The file may include a NaN or Inf value. Falling back to reading entire file."
            )

    if contents is None:  # normal read
        log = await read_eval_log_async(file, header_only=False)
        contents = eval_log_json(log)

    return contents


async def get_log_size(log_file: str) -> int:
    fs = filesystem(log_file)
    if fs.is_async():
        info = fs._file_info(await async_connection(log_file)._info(log_file))
    else:
        info = fs.info(log_file)
    return info.size


async def get_log_info(
    log_file: str,
    generate_direct_url: bool = False,
) -> dict[str, Any]:
    """Return file size and optionally a direct URL for the log file.

    Args:
        log_file: Path to the log file.
        generate_direct_url: If True and the file is on S3, include a
            presigned URL in the response.

    Returns:
        Dict with "size" (int) and optionally "direct_url" (str).
    """
    size = await get_log_size(log_file)
    result: dict[str, Any] = {"size": size}

    if generate_direct_url:
        fs = filesystem(log_file)
        if fs.is_s3():
            try:
                connection = async_connection(log_file)
                # _url is the async variant of url() (fsspec convention)
                url: str = await connection._url(log_file, expires=3600)
                result["direct_url"] = url
            except Exception:
                logger.warning(
                    f"Failed to generate presigned URL for {log_file}",
                    exc_info=True,
                )

    return result


async def delete_log(log_file: str) -> None:
    fs = filesystem(log_file)
    fs.rm(log_file)


async def get_log_bytes(
    log_file: str, start: int | None = None, end: int | None = None
) -> bytes:
    # fetch bytes
    adjusted_end = end + 1 if end is not None else None
    fs = filesystem(log_file)
    if fs.is_async():
        res: bytes = await async_connection(log_file)._cat_file(
            log_file, start=start, end=adjusted_end
        )
    else:
        res = fs.read_bytes(log_file, start, adjusted_end)

    return res


async def stream_log_bytes(
    log_file: str,
    start: int | None = None,
    end: int | None = None,
    log_file_size: int | None = None,
    stream_threshold_bytes: int = 50 * 1024 * 1024,
) -> AsyncIterable[bytes] | BytesIO:
    """Download log bytes with optional streaming for large files.

    Args:
        log_file: The log file to download.
        start: The start byte position to download from.
        end: The end byte position to download to (exclusive).
        log_file_size: The size of the log file, if known.
        stream_threshold_bytes: The threshold size in bytes for streaming.
    """
    if (start is None) != (end is None):
        raise ValueError("start and end must be both specified or both None")

    # fetch bytes
    fs = filesystem(log_file)
    if not fs.is_async() or not fs.is_s3():
        if start is not None and end is not None:
            request_size = end - start + 1
        elif log_file_size is not None:
            request_size = log_file_size
        else:
            request_size = await get_log_size(log_file)

        if request_size <= stream_threshold_bytes:
            # We only implement streaming for s3 and for large files (>50MB):
            bs = await get_log_bytes(log_file, start, end)
            return BytesIO(bs)

    connection = async_connection(log_file)

    if not isinstance(connection, S3FileSystem):
        raise ValueError("Expected S3FileSystem")

    bucket, key, vers = connection.split_path(log_file)

    if start is not None and end is not None:
        head = {"Range": f"bytes={start}-{end}"}
    else:
        head = {}

    async def _call_and_read() -> AsyncIterable[bytes]:
        resp = await connection._call_s3(
            "get_object",
            Bucket=bucket,
            Key=key,
            **version_id_kw(vers),
            **head,
            **connection.req_kw,
        )
        return cast(StreamingBody, resp["Body"])

    return cast(
        StreamingBody, await _error_wrapper(_call_and_read, retries=connection.retries)
    )


async def get_logs(
    request_log_dir: str, recursive: bool, fs_options: dict[str, Any]
) -> dict[str, Any] | None:
    # if the log_dir contains the path to a specific file
    # then just return that file
    if is_log_file(request_log_dir, [".json"]):
        file_info = await eval_log_info_async(request_log_dir)
        if file_info is not None:
            return get_log_listing(logs=[file_info], log_dir=dirname(request_log_dir))
        else:
            return None

    # list logs
    logs = await list_eval_logs_async(
        log_dir=request_log_dir, recursive=recursive, fs_options=fs_options
    )
    return get_log_listing(logs, request_log_dir)


def get_log_listing(logs: list[EvalLogInfo], log_dir: str) -> dict[str, Any]:
    listing = dict(
        log_dir=aliased_path(log_dir),
        files=[
            dict(
                name=normalize_azure_listing_name(log_dir, log.name),
                size=log.size,
                mtime=log.mtime,
                task=log.task,
                task_id=log.task_id,
            )
            for log in logs
        ],
    )
    return listing


def _normalize_listing_name(log_dir: str | None, name: str) -> str:
    if log_dir is None:
        return name
    return normalize_azure_listing_name(log_dir, name)


_async_connections: dict[str, AsyncFileSystem] = {}


def async_connection(log_file: str) -> AsyncFileSystem:
    # determine protocol
    protocol, _ = split_protocol(log_file)
    protocol = protocol or "file"

    # create connection if required
    if protocol not in _async_connections.keys():
        _async_connections[protocol] = fsspec.filesystem(
            protocol,
            asynchronous=True,
            loop=asyncio.get_event_loop(),
            **default_fs_options(log_file),
        )

    # return async file-system
    return _async_connections.get(protocol)


@contextlib.asynccontextmanager
async def async_filesystem(
    location: str, fs_options: dict[str, Any] = {}
) -> AsyncIterator[AsyncFileSystem]:
    # determine protocol
    protocol, _ = split_protocol(location)
    protocol = protocol or "file"

    # build options
    options = default_fs_options(location)
    options.update(fs_options)

    if protocol == "s3":
        options["skip_instance_cache"] = True
        s3 = S3FileSystem(asynchronous=True, **options)
        session = await s3.set_session()
        try:
            yield s3
        finally:
            await session.close()
    else:
        options.update({"asynchronous": True, "loop": asyncio.get_event_loop()})
        yield fsspec.filesystem(protocol, **options)


async def list_eval_logs_async(
    log_dir: str = os.environ.get("INSPECT_LOG_DIR", "./logs"),
    formats: list[Literal["eval", "json"]] | None = None,
    recursive: bool = True,
    descending: bool = True,
    fs_options: dict[str, Any] = {},
) -> list[EvalLogInfo]:
    """List all eval logs in a directory.

    Will be async for filesystem providers that support async (e.g. s3, gcs, etc.)
    otherwise will fallback to sync implementation.

    Args:
      log_dir (str): Log directory (defaults to INSPECT_LOG_DIR)
      formats (Literal["eval", "json"]): Formats to list (default
        to listing all formats)
      recursive (bool): List log files recursively (defaults to True).
      descending (bool): List in descending order.
      fs_options (dict[str, Any]): Optional. Additional arguments to pass through
          to the filesystem provider (e.g. `S3FileSystem`).

    Returns:
       List of EvalLog Info.
    """
    # async filesystem if we can
    fs = filesystem(log_dir, fs_options)
    if fs.is_async():
        async with async_filesystem(log_dir, fs_options=fs_options) as async_fs:
            # Attempt existence check with robust handling for Azure-style auth issues.
            try:
                exists = await async_fs._exists(log_dir)
            except Exception as ex:  # noqa: BLE001
                if should_suppress_azure_error(log_dir, ex):
                    logger.warning(azure_warning_hint(log_dir, ex))
                    exists = True
                else:
                    # TODO: Add S3 login error catching, as well as any other remote file system of interest
                    # Re-raise non-auth related issues
                    raise

            if exists:
                # prevent caching of listings
                async_fs.invalidate_cache(log_dir)
                # list logs
                if recursive:
                    if _walk_supports_detail(async_fs):
                        files = await _walk_with_detail(async_fs, log_dir)
                    else:
                        files = await _walk_without_detail(async_fs, log_dir)
                else:
                    files = cast(
                        list[dict[str, Any]],
                        await async_fs._ls(log_dir, detail=True),
                    )
                logs = [fs._file_info(file) for file in files]
                # resolve to eval logs
                return log_files_from_ls(logs, formats, descending)
            else:
                return []
    else:
        return list_eval_logs(
            log_dir=log_dir,
            formats=formats,
            recursive=recursive,
            descending=descending,
            fs_options=fs_options,
        )


def resolve_header_only(path: str, header_only: int | None) -> bool:
    # if there is a max_size passed, respect that and switch to
    # header_only mode if the file is too large
    if header_only == 0:
        return True
    if header_only is not None and size_in_mb(path) > int(header_only):
        return True
    else:
        return False


async def eval_log_info_async(
    log_file: str,
    fs_options: dict[str, Any] = {},
) -> EvalLogInfo | None:
    """Get EvalLogInfo for a specific log file asynchronously.

    Args:
        log_file (str): The complete path to the log file
        fs_options (dict[str, Any]): Optional. Additional arguments to pass through

    Returns:
        EvalLogInfo or None: The EvalLogInfo object if the file exists and is valid, otherwise None.
    """
    fs = filesystem(log_file, fs_options)
    if fs.exists(log_file):
        info = fs.info(log_file)
        return log_file_info(info)
    else:
        return None


def aliased_path(path: str) -> str:
    home_dir = os.path.expanduser("~")
    if path.startswith(home_dir):
        return path.replace(home_dir, "~", 1)
    else:
        return path


def _walk_supports_detail(fs: AsyncFileSystem) -> bool:
    walk = getattr(fs, "_walk", None)
    if walk is None:
        return False
    try:
        signature = inspect.signature(walk)
    except (TypeError, ValueError):
        return False
    parameter = signature.parameters.get("detail")
    if parameter is None:
        return False
    return parameter.kind in (
        inspect.Parameter.POSITIONAL_OR_KEYWORD,
        inspect.Parameter.KEYWORD_ONLY,
    )


async def _walk_with_detail(fs: AsyncFileSystem, log_dir: str) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    async for _, _, filenames in fs._walk(log_dir, detail=True):
        files.extend(filenames.values())
    return files


async def _walk_without_detail(
    fs: AsyncFileSystem, log_dir: str
) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    stack: list[str] = [log_dir]
    seen: set[str] = set()
    while stack:
        current = stack.pop()
        try:
            entries = await fs._ls(current, detail=True)
        except Exception:
            continue
        for entry in entries:
            name = entry.get("name") or entry.get("path")
            if not name:
                continue
            files.append(entry)
            entry_type = entry.get("type")
            if (entry_type == "directory" or name.endswith("/")) and name not in seen:
                seen.add(name)
                stack.append(name)
    return files
```

## `_view/fastapi_prereqs.py`

```python
from inspect_ai._util.error import pip_dependency_error


def verify_fastapi_prerequisites() -> None:
    # ensure we have all of the optional packages we need
    required_packages: list[str] = []
    try:
        import fastapi  # noqa: F401
    except ImportError:
        required_packages.append("fastapi")
    try:
        import uvicorn  # noqa: F401
    except ImportError:
        required_packages.append("uvicorn")

    if len(required_packages) > 0:
        raise pip_dependency_error("inspect_ai._view.fastapi_server", required_packages)
```

## `_view/fastapi_server.py`

```python
import json
import logging
import urllib.parse
from io import BytesIO
from logging import getLogger
from pathlib import Path
from typing import Any, Protocol

import anyio
import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from pydantic_core import to_jsonable_python
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from starlette.staticfiles import StaticFiles
from starlette.status import (
    HTTP_204_NO_CONTENT,
    HTTP_304_NOT_MODIFIED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)
from typing_extensions import override

from inspect_ai._display.core.active import display
from inspect_ai._eval.evalset import read_eval_set_info
from inspect_ai._util.constants import DEFAULT_SERVER_HOST, DEFAULT_VIEW_PORT
from inspect_ai._util.file import filesystem
from inspect_ai._util.local_server import get_machine_ip
from inspect_ai._view import notify
from inspect_ai._view.common import (
    delete_log,
    get_log_dir,
    get_log_file,
    get_log_files,
    get_log_info,
    get_log_size,
    get_logs,
    normalize_uri,
    parse_log_token,
    stream_log_bytes,
)
from inspect_ai.log._file import read_eval_log_headers_async
from inspect_ai.log._recorders.buffer import sample_buffer

logger = getLogger(__name__)


class AccessPolicy(Protocol):
    async def can_read(self, request: Request, file: str) -> bool: ...

    async def can_delete(self, request: Request, file: str) -> bool: ...

    async def can_list(self, request: Request, dir: str) -> bool: ...


class FileMappingPolicy(Protocol):
    async def map(self, request: Request, file: str) -> str: ...

    async def unmap(self, request: Request, file: str) -> str: ...


class InspectJsonResponse(JSONResponse):
    """Like the standard starlette JSON, but allows NaN."""

    @override
    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=True,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")


def view_server_app(
    mapping_policy: FileMappingPolicy | None = None,
    access_policy: AccessPolicy | None = None,
    default_dir: str = "",
    recursive: bool = True,
    fs_options: dict[str, Any] = {},
    generate_direct_urls: bool = False,
) -> "FastAPI":
    app = FastAPI()

    async def _map_file(request: Request, file: str) -> str:
        if mapping_policy is not None:
            return await mapping_policy.map(request, file)
        return file

    async def _unmap_file(request: Request, file: str) -> str:
        if mapping_policy is not None:
            return await mapping_policy.unmap(request, file)
        return file

    async def _validate_read(request: Request, file: str) -> None:
        if access_policy is not None:
            if not await access_policy.can_read(request, file):
                raise HTTPException(status_code=HTTP_403_FORBIDDEN)

    async def _validate_delete(request: Request, file: str) -> None:
        if access_policy is not None:
            if not await access_policy.can_delete(request, file):
                raise HTTPException(status_code=HTTP_403_FORBIDDEN)

    async def _validate_list(request: Request, file: str) -> None:
        if access_policy is not None:
            if not await access_policy.can_list(request, file):
                raise HTTPException(status_code=HTTP_403_FORBIDDEN)

    @app.get("/logs/{log:path}")
    async def api_log(
        request: Request,
        log: str,
        header_only: str | None = Query(None, alias="header-only"),
    ) -> Response:
        file = normalize_uri(log)
        await _validate_read(request, file)
        body = await get_log_file(await _map_file(request, file), header_only)
        return Response(content=body, media_type="application/json")

    @app.get("/log-info/{log:path}")
    async def api_log_info(request: Request, log: str) -> Response:
        file = normalize_uri(log)
        await _validate_read(request, file)
        info = await get_log_info(
            await _map_file(request, file),
            generate_direct_url=generate_direct_urls,
        )
        return InspectJsonResponse(content=info)

    @app.get("/log-delete/{log:path}")
    async def api_log_delete(request: Request, log: str) -> Response:
        file = normalize_uri(log)
        await _validate_delete(request, file)
        await delete_log(await _map_file(request, file))

        return InspectJsonResponse(content=True)

    @app.get("/log-bytes/{log:path}")
    async def api_log_bytes(
        request: Request,
        log: str,
        start: int = Query(...),
        end: int = Query(...),
    ) -> Response:
        file = normalize_uri(log)
        await _validate_read(request, file)
        mapped_file = await _map_file(request, file)

        # Get actual file size to clamp the requested range
        file_size = await get_log_size(mapped_file)

        if start >= file_size:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        actual_end = min(end, file_size - 1)

        response = await stream_log_bytes(
            mapped_file, start, actual_end, log_file_size=file_size
        )

        if isinstance(response, BytesIO):
            # For in-memory responses, Content-Length is known exactly
            content_length = response.getbuffer().nbytes
            return StreamingResponse(
                content=response,
                headers={"Content-Length": str(content_length)},
                media_type="application/octet-stream",
            )
        else:
            # For S3 streaming responses, omit Content-Length to use chunked
            # transfer encoding. The file may change between get_log_size()
            # and the actual S3 read (e.g. in-progress evals being rewritten),
            # which would cause a Content-Length mismatch.
            return StreamingResponse(
                content=response,
                media_type="application/octet-stream",
            )

    @app.get("/log-download/{log:path}")
    async def api_log_download(
        request: Request,
        log: str,
    ) -> Response:
        file = normalize_uri(log)
        await _validate_read(request, file)

        mapped_file = await _map_file(request, file)

        file_size = await get_log_size(mapped_file)
        stream = await stream_log_bytes(mapped_file, log_file_size=file_size)

        base_name = Path(file).stem
        filename = f"{base_name}.eval"

        headers = {
            "Content-Length": str(file_size),
            "Content-Disposition": f'attachment; filename="{filename}"',
        }

        if isinstance(stream, BytesIO):
            return Response(
                content=stream.getvalue(),
                headers=headers,
                media_type="application/octet-stream",
            )
        else:
            return StreamingResponse(
                content=stream,
                headers=headers,
                media_type="application/octet-stream",
            )

    @app.get("/log-dir")
    async def api_log_dir(
        request: Request,
        log_dir: str | None = Query(None, alias="log_dir"),
    ) -> Response:
        if log_dir is None:
            log_dir = default_dir
        await _validate_list(request, log_dir)
        log_dir_response = get_log_dir(log_dir)
        if log_dir_response is None:
            return Response(status_code=HTTP_404_NOT_FOUND)
        return InspectJsonResponse(content=log_dir_response)

    @app.get("/log-files")
    async def api_log_files(
        request: Request,
        log_dir: str | None = Query(None, alias="log_dir"),
    ) -> Response:
        if log_dir is None:
            log_dir = default_dir
        await _validate_list(request, log_dir)

        client_etag = request.headers.get("If-None-Match")
        mtime = 0.0
        file_count = 0
        if client_etag is not None:
            mtime, file_count = parse_log_token(client_etag)
        log_files_response: dict[str, Any] = await get_log_files(
            await _map_file(request, log_dir),
            recursive=recursive,
            fs_options=fs_options,
            mtime=mtime,
            file_count=file_count,
        )
        log_files_response["files"] = [
            {**file, "name": await _unmap_file(request, file["name"])}
            for file in log_files_response["files"]
        ]
        return InspectJsonResponse(content=log_files_response)

    @app.get("/logs")
    async def api_logs(
        request: Request,
        log_dir: str | None = Query(None, alias="log_dir"),
    ) -> Response:
        if log_dir is None:
            log_dir = default_dir
        await _validate_list(request, log_dir)
        listing = await get_logs(
            await _map_file(request, log_dir),
            recursive=recursive,
            fs_options=fs_options,
        )
        if listing is None:
            return Response(status_code=HTTP_404_NOT_FOUND)
        for file in listing["files"]:
            file["name"] = await _unmap_file(request, file["name"])
        listing["log_dir"] = await _unmap_file(request, listing["log_dir"])
        return InspectJsonResponse(content=listing)

    @app.get("/eval-set")
    async def eval_set(
        request: Request,
        log_dir: str = Query(None, alias="log_dir"),
        sub_dir: str = Query(None, alias="dir"),
    ) -> Response:
        # resolve the eval-set directory (using the log_dir and dir params)
        base_dir = log_dir if log_dir else default_dir
        if sub_dir and base_dir:
            eval_set_dir = base_dir + "/" + sub_dir.lstrip("/")
        elif sub_dir:
            eval_set_dir = sub_dir.lstrip("/")
        else:
            eval_set_dir = base_dir

        # validate that the directory can be listed
        await _validate_list(request, eval_set_dir)

        # return the eval set info for this directory
        eval_set = read_eval_set_info(
            await _map_file(request, eval_set_dir), fs_options=fs_options
        )
        return InspectJsonResponse(
            content=eval_set.model_dump(exclude_none=True) if eval_set else None
        )

    @app.get("/flow")
    async def flow(
        request: Request,
        log_dir: str = Query(None, alias="log_dir"),
        sub_dir: str = Query(None, alias="dir"),
    ) -> Response:
        # resolve the eval-set directory (using the log_dir and dir params)
        base_dir = log_dir if log_dir else default_dir
        if sub_dir and base_dir:
            flow_dir = base_dir + "/" + sub_dir.lstrip("/")
        elif sub_dir:
            flow_dir = sub_dir.lstrip("/")
        else:
            flow_dir = base_dir

        # validate that the directory can be listed
        await _validate_list(request, flow_dir)

        fs = filesystem(flow_dir)
        flow_file = f"{flow_dir}{fs.sep}flow.yaml"
        if fs.exists(flow_file):
            bytes = fs.read_bytes(flow_file)

            return Response(
                content=bytes.decode("utf-8"), status_code=200, media_type="text/yaml"
            )
        else:
            return Response(status_code=HTTP_404_NOT_FOUND)

    @app.get("/log-headers")
    async def api_log_headers(
        request: Request, file: list[str] = Query([])
    ) -> Response:
        files = [normalize_uri(f) for f in file]
        async with anyio.create_task_group() as tg:
            for f in files:
                tg.start_soon(_validate_read, request, f)
        headers = await read_eval_log_headers_async(
            [await _map_file(request, file) for file in files]
        )
        return InspectJsonResponse(to_jsonable_python(headers, exclude_none=True))

    @app.get("/events")
    async def api_events(
        last_eval_time: str | None = None,
    ) -> Response:
        actions = (
            ["refresh-evals"]
            if last_eval_time and notify.view_last_eval_time() > int(last_eval_time)
            else []
        )
        return InspectJsonResponse(actions)

    @app.get("/pending-samples")
    async def api_pending_samples(request: Request, log: str = Query(...)) -> Response:
        file = urllib.parse.unquote(log)
        await _validate_read(request, file)

        client_etag = request.headers.get("If-None-Match")

        buffer = sample_buffer(await _map_file(request, file))
        samples = buffer.get_samples(client_etag)
        if samples == "NotModified":
            return Response(status_code=HTTP_304_NOT_MODIFIED)
        elif samples is None:
            return Response(status_code=HTTP_404_NOT_FOUND)
        else:
            return InspectJsonResponse(
                content=samples.model_dump(),
                headers={"ETag": samples.etag},
            )

    @app.get("/log-message")
    async def api_log_message(
        request: Request, log_file: str, message: str
    ) -> Response:
        file = urllib.parse.unquote(log_file)
        await _validate_read(request, file)

        logger = logging.getLogger(__name__)
        logger.warning(f"[CLIENT MESSAGE] ({file}): {message}")

        return Response(status_code=HTTP_204_NO_CONTENT)

    @app.get("/pending-sample-data")
    async def api_sample_events(
        request: Request,
        log: str,
        id: str,
        epoch: int,
        last_event_id: int | None = Query(None, alias="last-event-id"),
        after_attachment_id: int | None = Query(None, alias="after-attachment-id"),
    ) -> Response:
        file = urllib.parse.unquote(log)
        await _validate_read(request, file)

        buffer = sample_buffer(await _map_file(request, file))
        sample_data = buffer.get_sample_data(
            id=id,
            epoch=epoch,
            after_event_id=last_event_id,
            after_attachment_id=after_attachment_id,
        )

        if sample_data is None:
            return Response(status_code=HTTP_404_NOT_FOUND)
        else:
            return InspectJsonResponse(content=sample_data.model_dump())

    return app


def filter_fastapi_log() -> None:
    #  filter overly chatty /api/events messages
    class RequestFilter(logging.Filter):
        def filter(self, record: logging.LogRecord) -> bool:
            return "/api/events" not in record.getMessage()

    # don't add if we already have
    access_logger = getLogger("uvicorn.access")
    for existing_filter in access_logger.filters:
        if isinstance(existing_filter, RequestFilter):
            return

    # add the filter
    access_logger.addFilter(RequestFilter())


def authorization_middleware(authorization: str) -> type[BaseHTTPMiddleware]:
    class AuthorizationMiddleware(BaseHTTPMiddleware):
        async def dispatch(
            self, request: Request, call_next: RequestResponseEndpoint
        ) -> Response:
            auth_header = request.headers.get("authorization", None)
            if auth_header != authorization:
                return Response("Unauthorized", status_code=401)
            return await call_next(request)

    return AuthorizationMiddleware


class OnlyDirAccessPolicy(AccessPolicy):
    def __init__(self, dir: str) -> None:
        super().__init__()
        self.dir = dir

    def _validate_log_dir(self, file: str) -> bool:
        return file.startswith(self.dir) and ".." not in file

    async def can_read(self, request: Request, file: str) -> bool:
        return self._validate_log_dir(file)

    async def can_delete(self, request: Request, file: str) -> bool:
        return self._validate_log_dir(file)

    async def can_list(self, request: Request, dir: str) -> bool:
        return self._validate_log_dir(dir)


def view_server(
    log_dir: str,
    recursive: bool = True,
    host: str = DEFAULT_SERVER_HOST,
    port: int = DEFAULT_VIEW_PORT,
    authorization: str | None = None,
    fs_options: dict[str, Any] = {},
) -> None:
    # get filesystem and resolve log_dir to full path
    fs = filesystem(log_dir)
    if not fs.exists(log_dir):
        fs.mkdir(log_dir, True)
    log_dir = fs.info(log_dir).name

    # setup server
    api = view_server_app(
        mapping_policy=None,
        access_policy=OnlyDirAccessPolicy(log_dir) if not authorization else None,
        default_dir=log_dir,
        recursive=recursive,
        fs_options=fs_options,
    )

    app = FastAPI()
    app.mount("/api", api)

    dist = Path(__file__).parent / "www" / "dist"
    app.mount("/", StaticFiles(directory=dist.as_posix(), html=True), name="static")

    if authorization:
        app.add_middleware(authorization_middleware(authorization))

    # filter request log (remove /api/events)
    filter_fastapi_log()

    # run app
    display().print(f"Inspect View: {log_dir}")

    async def run_server() -> None:
        config = uvicorn.Config(
            app, host=host, port=port, log_config=None, timeout_keep_alive=15
        )
        server = uvicorn.Server(config)

        async def announce_when_ready() -> None:
            while not server.started:
                await anyio.sleep(0.05)

            # Only show machine IP when binding to 0.0.0.0 (accessible from all interfaces)
            machine_ip = host
            if host == "0.0.0.0":
                machine_ip = get_machine_ip() or "0.0.0.0"
            display().print(
                f"======== Running on http://{machine_ip}:{port} ========\n"
                "(Press CTRL+C to quit)"
            )

        async with anyio.create_task_group() as tg:
            tg.start_soon(announce_when_ready)
            await server.serve()

    anyio.run(run_server)
```

## `_view/notify.py`

```python
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from inspect_ai._util.appdirs import inspect_data_dir
from inspect_ai._util.vscode import vscode_workspace_id

# lightweight tracking of when the last eval task completed
# this enables the view client to poll for changes frequently
# (e.g. every 1 second) with very minimal overhead.


def view_notify_eval(location: str) -> None:
    # do not do this when running under pytest
    if os.environ.get("PYTEST_VERSION", None) is not None:
        return

    file = view_last_eval_file()
    with open(file, "w", encoding="utf-8") as f:
        if not urlparse(location).scheme:
            location = Path(location).absolute().as_posix()

        # Construct a payload with context for the last eval
        payload = {
            "location": location,
        }
        workspace_id = vscode_workspace_id()
        if workspace_id:
            payload["workspace_id"] = workspace_id

        # Serialize the payload and write it to the signal file
        payload_json = json.dumps(payload, indent=2)
        f.write(payload_json)


def view_last_eval_time() -> int:
    file = view_last_eval_file()
    if file.exists():
        return int(file.stat().st_mtime * 1000)
    else:
        return 0


def view_data_dir() -> Path:
    return inspect_data_dir("view")


def view_last_eval_file() -> Path:
    return view_data_dir() / "last-eval-result"
```

## `_view/schema.py`

```python
import json
import os
import subprocess
from pathlib import Path
from typing import Any

from inspect_ai._eval.evalset import EvalSet
from inspect_ai.log import EvalLog

WWW_DIR = os.path.abspath((Path(__file__).parent / "www").as_posix())

BANNER = """
/*
 *  This file is automatically generated by schema.py
 *  DO NOT MODIFY IT BY HAND.
 *  To regenerate, run: python -m ../schema.py from within the
 *  src/inspect_ai/_view/www directory.
 */
"""


def sync_view_schema() -> None:
    """Generate a JSON schema and Typescript types for EvalLog.

    This is useful for keeping log file viewer JS development
    in sync w/ Python development
    """
    # export schema file
    schema_path = Path(WWW_DIR, "log-schema.json")
    types_path = Path(WWW_DIR, "src", "@types", "log.d.ts")

    with open(schema_path, "w", encoding="utf-8") as f:
        # make everything required
        eval_set = EvalSet.model_json_schema()
        schema = EvalLog.model_json_schema()
        defs: dict[str, Any] = schema["$defs"]

        # Add EvalSetInfo to definitions and reference it in root schema
        defs["EvalSetInfo"] = eval_set
        if "$defs" in eval_set:
            defs.update(eval_set["$defs"])

        # Add optional EvalSetInfo reference to root schema for TypeScript generation
        if "properties" not in schema:
            schema["properties"] = {}
        schema["properties"]["eval_set_info"] = {
            "anyOf": [{"$ref": "#/$defs/EvalSetInfo"}, {"type": "null"}],
            "default": None,
        }

        for key in defs.keys():
            defs[key] = schema_to_strict(defs[key])
        f.write(json.dumps(schema, indent=2))
        f.write("\n")

        # generate types w/ json-schema-to-typescript
        subprocess.run(
            [
                "yarn",
                "json2ts",
                "--input",
                schema_path,
                "--output",
                types_path,
                "--additionalProperties",
                "false",
                "--bannerComment",
                BANNER,
            ],
            cwd=WWW_DIR,
            check=True,
        )

        subprocess.run(["yarn", "prettier:write"], cwd=types_path.parent, check=True)


def schema_to_strict(schema: dict[str, Any]) -> dict[str, Any]:
    properties = schema.get("properties", None)
    if properties:
        schema["required"] = list(properties.keys())
        schema["additionalProperties"] = False

    return schema


if __name__ == "__main__":
    sync_view_schema()
```

## `_view/server.py`

```python
import logging
import os
import urllib.parse
from io import BytesIO
from logging import LogRecord, getLogger
from pathlib import Path
from typing import (
    Any,
    Awaitable,
    Callable,
    TypeVar,
)

from aiohttp import web
from pydantic_core import to_jsonable_python

from inspect_ai._display import display
from inspect_ai._eval.evalset import EvalSet, read_eval_set_info
from inspect_ai._util.azure import is_azure_auth_error, is_azure_path
from inspect_ai._util.constants import DEFAULT_SERVER_HOST, DEFAULT_VIEW_PORT
from inspect_ai._util.file import filesystem
from inspect_ai._view.azure import (
    azure_debug_exists,
    azure_runtime_hint,
)
from inspect_ai.log._file import (
    read_eval_log_headers_async,
)
from inspect_ai.log._recorders.buffer.buffer import sample_buffer

from .common import (
    async_connection,
    delete_log,
    get_log_bytes,
    get_log_dir,
    get_log_file,
    get_log_files,
    get_log_info,
    get_log_size,
    get_logs,
    normalize_uri,
    parse_log_token,
    stream_log_bytes,
)
from .notify import view_last_eval_time

logger = getLogger(__name__)


def view_server(
    log_dir: str,
    recursive: bool = True,
    host: str = DEFAULT_SERVER_HOST,
    port: int = DEFAULT_VIEW_PORT,
    authorization: str | None = None,
    fs_options: dict[str, Any] = {},
    generate_direct_urls: bool = False,
) -> None:
    # route table
    routes = web.RouteTableDef()

    # get filesystem and resolve log_dir to full path
    fs = filesystem(log_dir)
    if is_azure_path(log_dir):
        try:
            azure_debug_exists(fs, log_dir, display().print)
            # Don't call fs.info(); keep original URI (fsspec paths acceptable downstream)
        except Exception as ex:  # provide actionable guidance for Azure failures
            raise RuntimeError(azure_runtime_hint(ex)) from ex
    else:
        if not fs.exists(log_dir):
            fs.mkdir(log_dir, True)
        log_dir = fs.info(log_dir).name

    # validate log file requests (must be in the log_dir
    # unless authorization has been provided)
    def validate_log_file_request(log_file: str) -> None:
        if not authorization and (not log_file.startswith(log_dir) or ".." in log_file):
            raise web.HTTPUnauthorized()

    @routes.get("/api/logs/{log}")
    async def api_log(request: web.Request) -> web.Response:
        # log file requested
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)

        # header_only is based on a size threshold
        header_only = request.query.get("header-only", None)
        return await log_file_response(file, header_only)

    @routes.get("/api/log-size/{log}")
    async def api_log_size(request: web.Request) -> web.Response:
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)
        size = await get_log_size(file)
        return web.json_response(size)

    @routes.get("/api/log-info/{log}")
    async def api_log_info(request: web.Request) -> web.Response:
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)
        info = await get_log_info(file, generate_direct_url=generate_direct_urls)
        return web.json_response(info)

    @routes.get("/api/log-delete/{log}")
    async def api_log_delete(request: web.Request) -> web.Response:
        # log file requested
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)

        await delete_log(file)

        return web.json_response(True)

    @routes.get("/api/log-bytes/{log}")
    async def api_log_bytes(request: web.Request) -> web.Response:
        # log file requested
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)

        # header_only is based on a size threshold
        start_param = request.query.get("start", None)
        if start_param is None:
            return web.HTTPBadRequest(reason="No 'start' query param.")
        end_param = request.query.get("end", None)
        if end_param is None:
            return web.HTTPBadRequest(reason="No 'end' query param")
        start = int(start_param)
        end = int(end_param)
        body = await get_log_bytes(file, start, end)
        return web.Response(
            body=body,
            headers={"Content-Length": str(len(body))},
            content_type="application/octet-stream",
        )

    @routes.get("/api/log-download/{log}")
    async def api_log_download(request: web.Request) -> web.StreamResponse:
        # log file requested
        file = normalize_uri(request.match_info["log"])
        validate_log_file_request(file)

        # get file size and stream
        file_size = await get_log_size(file)
        stream = await stream_log_bytes(file, log_file_size=file_size)

        # determine filename
        base_name = Path(file).stem
        filename = f"{base_name}.eval"

        # set headers for download
        headers = {
            "Content-Length": str(file_size),
            "Content-Disposition": f'attachment; filename="{filename}"',
        }

        if isinstance(stream, BytesIO):
            # BytesIO case - return regular response
            return web.Response(
                body=stream.getvalue(),
                headers=headers,
                content_type="application/octet-stream",
            )
        else:
            # AsyncIterable case - create streaming response
            response = web.StreamResponse(headers=headers)
            response.content_type = "application/octet-stream"
            await response.prepare(request)

            async for chunk in stream:
                await response.write(chunk)

            await response.write_eof()
            return response

    @routes.get("/api/log-dir")
    async def api_log_dir(request: web.Request) -> web.Response:
        # log dir can optionally be overridden by the request
        if authorization:
            request_log_dir = request.query.getone("log_dir", None)
            if request_log_dir:
                request_log_dir = normalize_uri(request_log_dir)
            else:
                request_log_dir = log_dir
        else:
            request_log_dir = log_dir

        return web.json_response(get_log_dir(request_log_dir))

    @routes.get("/api/logs")
    async def api_logs(request: web.Request) -> web.Response:
        # log dir can optionally be overridden by the request
        if authorization:
            request_log_dir = request.query.getone("log_dir", None)
            if request_log_dir:
                request_log_dir = normalize_uri(request_log_dir)
            else:
                request_log_dir = log_dir
        else:
            request_log_dir = log_dir

        listing = await get_logs(
            request_log_dir, recursive=recursive, fs_options=fs_options
        )
        if listing is None:
            return web.Response(status=404, reason="File not found")
        return web.json_response(listing)

    @routes.get("/api/log-files")
    async def api_log_files(request: web.Request) -> web.Response:
        # log dir can optionally be overridden by the request
        if authorization:
            request_log_dir = request.query.getone("log_dir", None)
            if request_log_dir:
                request_log_dir = normalize_uri(request_log_dir)
            else:
                request_log_dir = log_dir
        else:
            request_log_dir = log_dir

        # see if there is an etag
        client_etag = request.headers.get("If-None-Match")
        mtime = 0.0
        file_count = 0
        if client_etag is not None:
            mtime, file_count = parse_log_token(client_etag)

        log_files_response: dict[str, Any] = await get_log_files(
            request_log_dir,
            recursive=recursive,
            fs_options=fs_options,
            mtime=mtime,
            file_count=file_count,
        )
        return web.json_response(log_files_response)

    @routes.get("/api/eval-set")
    async def eval_set(request: web.Request) -> web.Response:
        # log dir can optionally be overridden by the request
        if authorization:
            request_log_dir = request.query.getone("log_dir", None)
            if request_log_dir:
                request_log_dir = normalize_uri(request_log_dir)
            else:
                request_log_dir = log_dir
        else:
            request_log_dir = log_dir

        request_dir = request.query.getone("dir", None)
        if request_dir:
            if request_log_dir:
                request_dir = request_log_dir + "/" + request_dir.lstrip("/")
            else:
                request_dir = request_dir.lstrip("/")
            validate_log_file_request(request_dir)
        else:
            request_dir = request_log_dir

        eval_set = read_eval_set_info(request_dir, fs_options=fs_options)
        return web.json_response(to_jsonable_python(eval_set, exclude_none=True))

    @routes.get("/api/flow")
    async def flow(request: web.Request) -> web.Response:
        # log dir can optionally be overridden by the request
        if authorization:
            request_log_dir = request.query.getone("log_dir", None)
            if request_log_dir:
                request_log_dir = normalize_uri(request_log_dir)
            else:
                request_log_dir = log_dir
        else:
            request_log_dir = log_dir

        request_dir = request.query.getone("dir", None)
        if request_dir:
            if request_log_dir:
                request_dir = request_log_dir + "/" + request_dir.lstrip("/")
            else:
                request_dir = request_dir.lstrip("/")
            validate_log_file_request(request_dir)
        else:
            request_dir = request_log_dir

        fs = filesystem(request_dir)
        flow_file = f"{request_dir}{fs.sep}flow.yaml"
        try:
            bytes = fs.read_bytes(flow_file)
        except FileNotFoundError:
            return web.Response(status=404, reason="Flow file not found")
        except Exception as ex:
            if is_azure_path(request_dir) and is_azure_auth_error(ex):
                return web.Response(status=404, reason="Flow file not found")
            raise

        return web.Response(
            text=bytes.decode("utf-8"), content_type="application/yaml", status=200
        )

    @routes.get("/api/log-headers")
    async def api_log_headers(request: web.Request) -> web.Response:
        files = request.query.getall("file", [])
        files = [normalize_uri(file) for file in files]
        map(validate_log_file_request, files)
        return await log_headers_response(files)

    @routes.get("/api/events")
    async def api_events(request: web.Request) -> web.Response:
        last_eval_time = request.query.get("last_eval_time", None)
        actions = (
            ["refresh-evals"]
            if last_eval_time and view_last_eval_time() > int(last_eval_time)
            else []
        )
        return web.json_response(actions)

    @routes.get("/api/pending-samples")
    async def api_pending_samples(request: web.Request) -> web.Response:
        # log file requested
        file = query_param_required("log", request, str)

        file = urllib.parse.unquote(file)
        validate_log_file_request(file)

        # see if there is an etag
        client_etag = request.headers.get("If-None-Match")

        # get samples and respond
        buffer = sample_buffer(file)
        samples = buffer.get_samples(client_etag)
        if samples == "NotModified":
            return web.Response(status=304)
        elif samples is None:
            return web.Response(status=404)
        else:
            return web.Response(
                body=samples.model_dump_json(), headers={"ETag": samples.etag}
            )

    @routes.get("/api/log-message")
    async def api_log_message(request: web.Request) -> web.Response:
        # log file requested
        file = query_param_required("log_file", request, str)

        file = urllib.parse.unquote(file)
        validate_log_file_request(file)

        # message to log
        message = query_param_required("message", request, str)

        # log the message
        logger.warning(f"[CLIENT MESSAGE] ({file}): {message}")

        # respond
        return web.Response(status=204)

    @routes.get("/api/pending-sample-data")
    async def api_sample_events(request: web.Request) -> web.Response:
        # log file requested
        file = query_param_required("log", request, str)

        file = urllib.parse.unquote(file)
        validate_log_file_request(file)

        # sample id information
        id = query_param_required("id", request, str)
        epoch = query_param_required("epoch", request, int)

        # get sync info
        after_event_id = query_param_optional("last-event-id", request, int)
        after_attachment_id = query_param_optional("after-attachment-id", request, int)

        # get samples and responsd
        buffer = sample_buffer(file)
        sample_data = buffer.get_sample_data(
            id=id,
            epoch=epoch,
            after_event_id=after_event_id,
            after_attachment_id=after_attachment_id,
        )

        # respond
        if sample_data is None:
            return web.Response(status=404)
        else:
            return web.Response(body=sample_data.model_dump_json())

    # optional auth middleware
    @web.middleware
    async def authorize(
        request: web.Request,
        handler: Callable[[web.Request], Awaitable[web.StreamResponse]],
    ) -> web.StreamResponse:
        if request.headers.get("Authorization", None) != authorization:
            return web.HTTPUnauthorized()
        else:
            return await handler(request)

    # setup server
    app = web.Application(middlewares=[authorize] if authorization else [])
    app.router.add_routes(routes)
    app.router.register_resource(WWWResource())

    # filter request log (remove /api/events)
    filter_aiohttp_log()

    # run app
    display().print(f"Inspect View: {log_dir}")
    web.run_app(
        app=app,
        host=host,
        port=port,
        print=display().print,
        access_log_format='%a %t "%r" %s %b (%Tf)',
        shutdown_timeout=1,
        keepalive_timeout=15,
    )


def eval_set_response(eval_set: EvalSet | None) -> web.Response:
    if eval_set is None:
        return web.Response(status=404, reason="Eval set not found")
    else:
        response = dict(
            eval_set_id=eval_set.eval_set_id,
            tasks=[
                dict(
                    name=task.name,
                    task_id=task.task_id,
                    task_file=task.task_file,
                    task_args=task.task_args,
                    model=task.model,
                    model_roles=task.model_roles,
                    sequence=task.sequence,
                )
                for task in eval_set.tasks
            ],
        )
        return web.json_response(response)


async def log_file_response(file: str, header_only_param: str | None) -> web.Response:
    try:
        contents = await get_log_file(file, header_only_param)

        return web.Response(body=contents, content_type="application/json")

    except Exception as error:
        logger.exception(error)
        return web.Response(status=500, reason="File not found")


async def log_bytes_response(log_file: str, start: int, end: int) -> web.Response:
    # build headers
    content_length = end - start + 1
    headers = {
        "Content-Type": "application/octet-stream",
        "Content-Length": str(content_length),
    }

    # fetch bytes
    fs = filesystem(log_file)
    if fs.is_async():
        bytes = await async_connection(log_file)._cat_file(
            log_file, start=start, end=end + 1
        )
    else:
        bytes = fs.read_bytes(log_file, start, end + 1)

    # return response
    return web.Response(status=200, body=bytes, headers=headers)


async def log_headers_response(files: list[str]) -> web.Response:
    headers = await read_eval_log_headers_async(files)
    return web.json_response(to_jsonable_python(headers, exclude_none=True))


class WWWResource(web.StaticResource):
    def __init__(self) -> None:
        super().__init__(
            "", os.path.abspath((Path(__file__).parent / "www" / "dist").as_posix())
        )

    async def _handle(self, request: web.Request) -> web.StreamResponse:
        # serve /index.html for /
        filename = request.match_info["filename"]
        if not filename:
            request.match_info["filename"] = "index.html"

        # call super
        response = await super()._handle(request)

        # disable caching as this is only ever served locally
        # and w/ caching sometimes we get stale assets
        response.headers.update(
            {
                "Expires": "Fri, 01 Jan 1990 00:00:00 GMT",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
            }
        )

        # return response
        return response


def filter_aiohttp_log() -> None:
    #  filter overly chatty /api/events messages
    class RequestFilter(logging.Filter):
        def filter(self, record: LogRecord) -> bool:
            return "/api/events" not in record.getMessage()

    # don't add if we already have
    access_logger = getLogger("aiohttp.access")
    for existing_filter in access_logger.filters:
        if isinstance(existing_filter, RequestFilter):
            return

    # add the filter
    access_logger.addFilter(RequestFilter())


T = TypeVar("T")  # Define type variable


def query_param_required(
    key: str, request: web.Request, converter: Callable[[str], T]
) -> T:
    """
    Generic parameter validation function.

    Args:
        key: Parameter key to look up
        request: aiohttp Request object
        converter: Function to convert the string parameter to type T

    Returns:
        Converted parameter value of type T

    Raises:
        HTTPBadRequest: If parameter is missing or invalid
    """
    value = request.query.get(key)
    if value is None:
        raise web.HTTPBadRequest(text=f"Missing parameter {key}")

    try:
        return converter(value)
    except ValueError:
        raise web.HTTPBadRequest(text=f"Invalid value {value} for {key}")


def query_param_optional(
    key: str, request: web.Request, converter: Callable[[str], T]
) -> T | None:
    """
    Generic parameter validation function.

    Args:
        key: Parameter key to look up
        request: aiohttp Request object
        converter: Function to convert the string parameter to type T

    Returns:
        Converted parameter value of type T

    Raises:
        HTTPBadRequest: If parameter is missing or invalid
    """
    value = request.query.get(key)
    if value is None:
        return None

    try:
        return converter(value)
    except ValueError:
        raise web.HTTPBadRequest(text=f"Invalid value {value} for {key}")
```

## `_view/view.py`

```python
import atexit
import logging
import os
from pathlib import Path
from typing import Any

import psutil

from inspect_ai._display import display
from inspect_ai._util.constants import (
    DEFAULT_SERVER_HOST,
    DEFAULT_VIEW_PORT,
)
from inspect_ai._util.dotenv import init_dotenv
from inspect_ai._util.error import exception_message
from inspect_ai._util.logger import init_logger
from inspect_ai._view.server import view_server

from .fastapi_prereqs import verify_fastapi_prerequisites
from .notify import view_data_dir

logger = logging.getLogger(__name__)


def view(
    log_dir: str | None = None,
    recursive: bool = True,
    host: str = DEFAULT_SERVER_HOST,
    port: int = DEFAULT_VIEW_PORT,
    authorization: str | None = None,
    log_level: str | None = None,
    fs_options: dict[str, Any] = {},
) -> None:
    """Run the Inspect View server.

    Args:
        log_dir: Directory to view logs from.
        recursive: Recursively list files in `log_dir`.
        host: Tcp/ip host (defaults to "127.0.0.1").
        port: Tcp/ip port (defaults to 7575).
        authorization: Validate requests by checking for this authorization header.
        log_level: Level for logging to the console: "debug", "http", "sandbox",
            "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        fs_options: Additional arguments to pass through to the filesystem provider
            (e.g. `S3FileSystem`). Use `{"anon": True }` if you are accessing a
            public S3 bucket with no credentials.
    """
    init_dotenv()
    init_logger(log_level)

    # initialize the log_dir
    log_dir = log_dir if log_dir else os.getenv("INSPECT_LOG_DIR", "./logs")

    # acquire the requested port
    view_acquire_port(view_data_dir(), port)

    # run server
    if os.getenv("INSPECT_VIEW_FASTAPI_SERVER"):
        verify_fastapi_prerequisites()
        from .fastapi_server import view_server as fastapi_view_server

        fastapi_view_server(
            log_dir=log_dir,
            recursive=recursive,
            host=host,
            port=port,
            authorization=authorization,
            fs_options=fs_options,
        )
    else:
        view_server(
            log_dir=log_dir,
            recursive=recursive,
            host=host,
            port=port,
            authorization=authorization,
            fs_options=fs_options,
        )


def view_port_pid_file(app_dir: Path, port: int) -> Path:
    ports_dir = app_dir / "ports"
    ports_dir.mkdir(parents=True, exist_ok=True)
    return ports_dir / str(port)


def view_acquire_port(app_dir: Path, port: int) -> None:
    # pid file name
    pid_file = view_port_pid_file(app_dir, port)

    # does it already exist? if so terminate that process
    if pid_file.exists():
        WAIT_SECONDS = 5
        with open(pid_file, "r", encoding="utf-8") as f:
            pid = int(f.read().strip())
        try:
            p = psutil.Process(pid)
            p.terminate()
            display().print(f"Terminating existing view command using port {port}")
            p.wait(WAIT_SECONDS)

        except psutil.NoSuchProcess:
            # expected error for crufty pid files
            pass
        except psutil.TimeoutExpired:
            logger.warning(
                f"Timed out waiting for process to exit for {WAIT_SECONDS} seconds."
            )
        except psutil.AccessDenied:
            logger.warning(
                "Attempted to kill existing view command on "
                + f"port {port} but access was denied."
            )
        except Exception as ex:
            logger.warning(
                "Attempted to kill existing view command on "
                + f"port {port} but error occurred: {exception_message(ex)}"
            )

    # write our pid to the file
    with open(pid_file, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))

    # arrange to release on exit
    def release_lock_file() -> None:
        try:
            pid_file.unlink(True)
        except Exception:
            pass

    atexit.register(release_lock_file)
```

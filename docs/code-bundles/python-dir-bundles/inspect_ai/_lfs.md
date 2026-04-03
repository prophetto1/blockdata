# Python Bundle: `_lfs`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `6`

## Files

- `_lfs/__init__.py`
- `_lfs/_cache.py`
- `_lfs/_client.py`
- `_lfs/_pointer.py`
- `_lfs/exceptions.py`
- `_lfs/resolver.py`

## `_lfs/__init__.py`

```python
"""LFS transparent fallback for directories containing pointer files."""

from .exceptions import LFSError
from .resolver import resolve_lfs_directory

__all__ = ["LFSError", "resolve_lfs_directory"]
```

## `_lfs/_cache.py`

```python
"""LFS object downloading and cache management.

Downloads real file content from GitHub LFS into a local cache directory,
replacing pointer stubs with their actual content.
"""

import logging
import os
import time
from pathlib import Path

from ._client import (
    LFSDownloadInfo,
    download_lfs_object,
    fetch_download_urls,
)
from ._pointer import LFSPointer, is_lfs_pointer, parse_lfs_pointer
from .exceptions import LFSDownloadError

logger = logging.getLogger(__name__)


def download_lfs_objects(
    source_dir: Path,
    cache_dir: Path,
    repo_url: str,
) -> None:
    """Download LFS objects from GitHub into cache_dir.

    Walks source_dir, identifies LFS pointer files, checks the cache for each
    one, and downloads any missing or stale files via the LFS batch API.

    The cache mirrors the source directory structure. Each downloaded file has a
    sidecar ``<name>.oid`` file storing the SHA-256 OID. On subsequent runs, a
    cached file is considered fresh only when both the file and its sidecar
    exist and the sidecar OID matches the pointer's OID. Stale, incomplete, or
    missing entries are (re-)downloaded. Files in cache_dir that no longer exist
    in source_dir are pruned along with their sidecars.

    Args:
        source_dir: Directory containing LFS pointer files.
        cache_dir: Cache directory (will contain real files after download).
        repo_url: HTTPS URL of the git repository.

    Raises:
        LFSDownloadError: If any critical file fails to download.
    """
    # Collect pointers and check cache status.
    needs_download: list[tuple[Path, LFSPointer]] = []
    source_rel_paths: set[Path] = set()

    for repo_file in _walk_files(source_dir):
        rel = repo_file.relative_to(source_dir)
        source_rel_paths.add(rel)

        # .gitattributes applies uniformly, so all files should be pointers.
        assert is_lfs_pointer(repo_file), (
            f"Unexpected real file in LFS directory: {repo_file}"
        )

        parsed = parse_lfs_pointer(repo_file)
        if parsed is None:
            logger.warning("Could not parse LFS pointer: %s", repo_file)
            continue
        pointer = parsed

        cache_file = cache_dir / rel
        oid_file = cache_file.with_suffix(cache_file.suffix + ".oid")

        # Cache hit: file exists and OID matches.
        if cache_file.exists() and oid_file.exists():
            cached_oid = oid_file.read_text(encoding="utf-8").strip()
            if cached_oid == pointer.oid:
                logger.debug("%s: already up to date", rel)
                continue
            # OID mismatch — remove stale cache files before re-download.
            cache_file.unlink(missing_ok=True)
            oid_file.unlink(missing_ok=True)
        elif cache_file.exists() or oid_file.exists():
            # Incomplete cache entry — clean up orphaned files.
            cache_file.unlink(missing_ok=True)
            oid_file.unlink(missing_ok=True)

        needs_download.append((repo_file, pointer))

    if not needs_download:
        logger.debug("LFS cache is up to date")
        _prune_cache(cache_dir, source_rel_paths)
        return

    logger.info("Downloading %d LFS objects...", len(needs_download))

    # Batch request for download URLs.
    batch_objects = [(p.oid, p.size) for _, p in needs_download]
    oid_labels = {p.oid: str(f.relative_to(source_dir)) for f, p in needs_download}
    download_infos = fetch_download_urls(
        batch_objects, repo_url=repo_url, oid_labels=oid_labels
    )

    # Index by OID for lookup.
    info_by_oid: dict[str, LFSDownloadInfo] = {d.oid: d for d in download_infos}

    # Download each file.
    failed: list[str] = []
    for repo_file, pointer in needs_download:
        rel = repo_file.relative_to(source_dir)
        cache_file = cache_dir / rel
        oid_file = cache_file.with_suffix(cache_file.suffix + ".oid")
        marker_file = cache_file.with_suffix(cache_file.suffix + ".downloading")

        info = info_by_oid.get(pointer.oid)
        if info is None:
            logger.warning("%s: no download URL (%s)", rel, pointer.oid[:12])
            failed.append(str(rel))
            continue

        # Multiprocess coordination: skip if another process is downloading.
        if not _try_create_marker(marker_file):
            logger.debug("Another process is downloading %s, waiting...", rel)
            _wait_for_marker(marker_file)
            if cache_file.exists():
                continue
            # Other process may have failed; try to acquire marker ourselves.
            if not _try_create_marker(marker_file):
                _wait_for_marker(marker_file)
                if cache_file.exists():
                    continue
                logger.warning("Could not acquire download marker for %s", rel)
                failed.append(str(rel))
                continue

        try:
            download_lfs_object(info, marker_file)
            marker_file.rename(cache_file)
            oid_file.write_text(pointer.oid, encoding="utf-8")
            logger.info("%s: downloaded", rel)
        except Exception as e:
            # Clean up all partial state.
            marker_file.unlink(missing_ok=True)
            cache_file.unlink(missing_ok=True)
            oid_file.unlink(missing_ok=True)
            failed.append(str(rel))
            logger.warning("%s: download failed — %s", rel, e, exc_info=True)

    if failed:
        raise LFSDownloadError(
            f"Failed to download {len(failed)} LFS object(s): {', '.join(failed)}"
        )

    _prune_cache(cache_dir, source_rel_paths)


def _prune_cache(cache_dir: Path, source_rel_paths: set[Path]) -> None:
    """Remove cached files that no longer exist in the source directory."""
    if not cache_dir.is_dir():
        return

    # Metadata suffixes managed by this module.
    metadata_suffixes = {".oid", ".downloading"}

    for cached_file in _walk_files(cache_dir):
        rel = cached_file.relative_to(cache_dir)

        # Skip metadata files — they'll be orphaned when their parent is removed.
        if rel.suffix in metadata_suffixes:
            continue

        if rel not in source_rel_paths:
            cached_file.unlink(missing_ok=True)
            # Clean up associated metadata.
            for suffix in metadata_suffixes:
                cached_file.with_suffix(cached_file.suffix + suffix).unlink(
                    missing_ok=True
                )
            logger.info("Pruned orphaned cache entry: %s", rel)


def _walk_files(directory: Path) -> list[Path]:
    """Recursively list all files in a directory."""
    return [e for e in sorted(directory.rglob("*")) if e.is_file()]


def _try_create_marker(marker_file: Path) -> bool:
    """Atomically create a marker file. Returns True if we created it."""
    marker_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(marker_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        return True
    except FileExistsError:
        return False


def _wait_for_marker(marker_file: Path, timeout_seconds: int = 180) -> None:
    """Wait for a marker file to be removed (another process finished).

    If the marker still exists after timeout, removes it as likely orphaned.
    """
    deadline = time.monotonic() + timeout_seconds
    while marker_file.exists() and time.monotonic() < deadline:
        time.sleep(0.5)

    # If marker still exists after timeout, it's likely orphaned by a crashed
    # process. Remove it so subsequent attempts can proceed.
    if marker_file.exists():
        marker_file.unlink(missing_ok=True)
        logger.warning("Removed orphaned marker file: %s", marker_file)
```

## `_lfs/_client.py`

```python
"""GitHub LFS batch API client.

Downloads LFS objects from public GitHub repositories using the
batch API endpoint. No authentication is required for public repos.
"""

import hashlib
import json
import logging
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .exceptions import LFSBatchError, LFSDownloadError

logger = logging.getLogger(__name__)

_LFS_MEDIA_TYPE = "application/vnd.git-lfs+json"


@dataclass(frozen=True)
class LFSDownloadInfo:
    """Download URL and metadata for a single LFS object."""

    oid: str
    size: int
    href: str


_BATCH_CHUNK_SIZE = 50
"""Max objects per batch API request to avoid 413 responses from GitHub."""


def fetch_download_urls(
    objects: list[tuple[str, int]],
    repo_url: str,
    oid_labels: dict[str, str] | None = None,
) -> list[LFSDownloadInfo]:
    """Get download URLs for LFS objects via the batch API.

    Chunks requests to avoid exceeding GitHub's payload size limit.

    Args:
        objects: List of (oid, size) tuples to request.
        repo_url: HTTPS URL of the git repository.
        oid_labels: Optional mapping from OID to a human-readable label
            (e.g. relative file path) included in warning messages.

    Returns:
        List of download info for each object that has a download URL.

    Raises:
        LFSBatchError: If the batch API call fails.
    """
    if not objects:
        return []

    results: list[LFSDownloadInfo] = []
    for i in range(0, len(objects), _BATCH_CHUNK_SIZE):
        chunk = objects[i : i + _BATCH_CHUNK_SIZE]
        results.extend(_fetch_batch_chunk(chunk, repo_url, oid_labels or {}))
    return results


def _fetch_batch_chunk(
    objects: list[tuple[str, int]],
    repo_url: str,
    oid_labels: dict[str, str],
) -> list[LFSDownloadInfo]:
    """Fetch download URLs for a single batch chunk."""
    batch_endpoint = f"{repo_url}/info/lfs/objects/batch"
    payload = {
        "operation": "download",
        "transfers": ["basic"],
        "objects": [{"oid": oid, "size": size} for oid, size in objects],
    }

    req = urllib.request.Request(
        batch_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": _LFS_MEDIA_TYPE,
            "Accept": _LFS_MEDIA_TYPE,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise LFSBatchError(f"LFS batch API returned HTTP {e.code}: {e.reason}") from e
    except (urllib.error.URLError, OSError) as e:
        raise LFSBatchError(f"Failed to reach LFS batch API: {e}") from e
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise LFSBatchError(f"Failed to parse LFS batch API response: {e}") from e

    results: list[LFSDownloadInfo] = []
    for obj in body.get("objects", []):
        oid = obj.get("oid", "")
        size = obj.get("size", 0)
        actions = obj.get("actions", {})
        download = actions.get("download", {})
        href = download.get("href", "")

        label = oid_labels.get(oid, oid[:12])

        if obj.get("error"):
            err = obj["error"]
            logger.warning(
                "%s: server error %s — %s",
                label,
                err.get("code", "?"),
                err.get("message", "unknown"),
            )
            continue

        if not href:
            logger.warning("%s: no download URL in response", label)
            continue

        results.append(LFSDownloadInfo(oid=oid, size=size, href=href))

    return results


def download_lfs_object(
    info: LFSDownloadInfo,
    dest_path: Path,
) -> None:
    """Download a single LFS object and verify its integrity.

    Args:
        info: Download info from the batch API.
        dest_path: Where to write the downloaded file.

    Raises:
        LFSDownloadError: If download fails or integrity check fails.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(info.href, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            hasher = hashlib.sha256()
            total_bytes = 0

            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    hasher.update(chunk)
                    total_bytes += len(chunk)
    except (urllib.error.URLError, OSError) as e:
        dest_path.unlink(missing_ok=True)
        raise LFSDownloadError(
            f"Failed to download LFS object {info.oid[:12]}: {e}"
        ) from e

    actual_oid = hasher.hexdigest()
    if actual_oid != info.oid:
        dest_path.unlink(missing_ok=True)
        raise LFSDownloadError(
            f"SHA-256 mismatch for LFS object {info.oid[:12]}: "
            f"expected {info.oid}, got {actual_oid}"
        )

    if total_bytes != info.size:
        logger.warning(
            "LFS object %s: expected %d bytes, got %d",
            info.oid[:12],
            info.size,
            total_bytes,
        )
```

## `_lfs/_pointer.py`

```python
"""LFS pointer file detection and parsing."""

import re
from dataclasses import dataclass
from pathlib import Path

LFS_POINTER_VERSION = "version https://git-lfs.github.com/spec/v1"
_OID_PATTERN = re.compile(r"^oid sha256:([0-9a-f]{64})$")


@dataclass(frozen=True)
class LFSPointer:
    """Parsed LFS pointer file."""

    oid: str
    """SHA-256 content hash (64 hex characters)."""

    size: int
    """File size in bytes."""


def is_lfs_pointer(file_path: Path) -> bool:
    """Check if a file is an LFS pointer.

    Reads only the first line to minimize I/O.
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            first_line = f.readline().rstrip("\n")
        return first_line == LFS_POINTER_VERSION
    except (OSError, UnicodeDecodeError):
        return False


def parse_lfs_pointer(file_path: Path) -> LFSPointer | None:
    """Parse an LFS pointer file.

    Returns:
        Parsed pointer, or None if the file is not a valid LFS pointer.
    """
    try:
        text = file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    return _parse_pointer_text(text)


def _parse_pointer_text(text: str) -> LFSPointer | None:
    """Parse LFS pointer content from a string."""
    lines = text.strip().splitlines()
    if len(lines) < 3:
        return None

    if lines[0] != LFS_POINTER_VERSION:
        return None

    oid_match = _OID_PATTERN.match(lines[1])
    if not oid_match:
        return None

    size_prefix = "size "
    if not lines[2].startswith(size_prefix):
        return None

    try:
        size = int(lines[2][len(size_prefix) :])
    except ValueError:
        return None

    if size < 0:
        return None

    return LFSPointer(oid=oid_match.group(1), size=size)
```

## `_lfs/exceptions.py`

```python
"""LFS-related exceptions."""


class LFSError(Exception):
    """Base exception for LFS operations."""


class LFSBatchError(LFSError):
    """Error calling LFS batch API."""


class LFSDownloadError(LFSError):
    """Error downloading LFS object."""


class LFSResolverError(LFSError):
    """Error resolving dist directory."""
```

## `_lfs/resolver.py`

```python
"""Directory resolution with LFS transparent fallback.

Determines whether a directory contains real files or LFS pointer files,
and returns a directory path with real content in either case.
"""

from pathlib import Path

from ._cache import download_lfs_objects
from ._pointer import is_lfs_pointer
from .exceptions import LFSResolverError


def resolve_lfs_directory(
    source_dir: Path,
    cache_dir: Path,
    repo_url: str,
) -> Path:
    """Resolve a directory that may contain LFS pointer files.

    Recursively checks source_dir for LFS pointers. If none are found, returns
    source_dir as-is. Otherwise downloads real content from the LFS server into
    cache_dir and returns cache_dir.

    The cache is incremental: only files whose OID changed or are missing are
    downloaded, and files removed from source_dir are pruned from cache_dir.

    Args:
        source_dir: Directory to check recursively for LFS pointer files.
        cache_dir: Cache directory for downloaded LFS content.
        repo_url: HTTPS URL of the git repository (for LFS downloads).

    Returns:
        Path to a directory tree containing real file content.

    Raises:
        LFSResolverError: If source_dir is missing or LFS download fails.
    """
    if not source_dir.is_dir():
        raise LFSResolverError(f"Directory not found: {source_dir}")

    if not _has_lfs_pointers(source_dir):
        return source_dir

    try:
        download_lfs_objects(source_dir, cache_dir, repo_url=repo_url)
    except Exception as e:
        raise LFSResolverError(f"Failed to download LFS objects: {e}") from e

    return cache_dir


def _has_lfs_pointers(directory: Path) -> bool:
    """Check if any file in the directory is an LFS pointer."""
    return any(is_lfs_pointer(f) for f in directory.rglob("*") if f.is_file())
```

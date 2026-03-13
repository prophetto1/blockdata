# services/platform-api/tests/test_conversion.py
import asyncio
import pytest
from app.domain.conversion.models import ConvertRequest, OutputTarget
from app.domain.conversion.service import resolve_track, convert


def _build_request(track=None, source_type="txt"):
    output = OutputTarget(
        bucket="documents",
        key="converted/source/file.md",
        signed_upload_url="https://example.test/upload",
        token=None,
    )
    return ConvertRequest(
        source_uid="source-uid",
        conversion_job_id="job-uid",
        track=track,
        source_type=source_type,
        source_download_url="https://example.test/source",
        output=output,
        callback_url="https://example.test/callback",
    )


def test_resolve_track_explicit():
    req = _build_request(track="pandoc", source_type="rst")
    assert resolve_track(req) == "pandoc"


def test_resolve_track_default():
    assert resolve_track(_build_request(track=None, source_type="txt")) == "docling"
    assert resolve_track(_build_request(track=None, source_type="md")) == "docling"
    assert resolve_track(_build_request(track=None, source_type="docx")) == "docling"



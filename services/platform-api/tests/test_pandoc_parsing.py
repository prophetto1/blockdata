from unittest.mock import AsyncMock, patch

import pytest

from app.domain.pandoc_parsing.service import (
    PandocUnavailableError,
    parse_pandoc_source,
)


@pytest.mark.asyncio
async def test_parse_pandoc_source_returns_ast_when_enabled():
    with patch.dict(
        "os.environ",
        {"PLATFORM_PARSE_PANDOC_ENABLED": "true"},
        clear=False,
    ), patch(
        "app.domain.pandoc_parsing.service._run_pandoc",
        new=AsyncMock(return_value=b'{"pandoc-api-version":[1,23],"blocks":[]}'),
    ) as mock_runner:
        result = await parse_pandoc_source(b"Heading\n=======\n", "rst")

    assert result.source_type == "rst"
    assert result.input_format == "rst"
    assert result.pandoc_ast_json == b'{"pandoc-api-version":[1,23],"blocks":[]}'
    assert mock_runner.await_count == 1


@pytest.mark.asyncio
async def test_parse_pandoc_source_rejects_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported Pandoc source type"):
        await parse_pandoc_source(b"# Hello", "md")


@pytest.mark.asyncio
async def test_parse_pandoc_source_rejects_when_disabled():
    with patch.dict("os.environ", {"PLATFORM_PARSE_PANDOC_ENABLED": "false"}, clear=False):
        with pytest.raises(PandocUnavailableError, match="disabled"):
            await parse_pandoc_source(b"= Title =", "asciidoc")

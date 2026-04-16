from unittest.mock import AsyncMock, patch

import pytest

from app.domain.markdown_parsing.service import parse_markdown_source


@pytest.mark.asyncio
async def test_parse_markdown_source_returns_mdast_and_markdown_bytes():
    with patch(
        "app.domain.markdown_parsing.service._run_remark_runner",
        new=AsyncMock(return_value=b'{"type":"root","children":[]}'),
    ) as mock_runner:
        result = await parse_markdown_source(b"# Hello\n", "md")

    assert result.source_type == "md"
    assert result.markdown_bytes == b"# Hello\n"
    assert result.mdast_json == b'{"type":"root","children":[]}'
    assert mock_runner.await_count == 1


@pytest.mark.asyncio
async def test_parse_markdown_source_rejects_non_markdown_type():
    with pytest.raises(ValueError, match="Unsupported Markdown source type"):
        await parse_markdown_source(b"plain text", "txt")

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha1
import json
from pathlib import Path
import re
import sqlite3
from tempfile import TemporaryDirectory
from time import perf_counter
from typing import Callable
from zipfile import ZIP_DEFLATED, ZipFile

import mistune
import numpy as np

from app.observability.pipeline_metrics import (
    pipeline_tracer,
    record_pipeline_chunk_count,
    record_pipeline_stage_duration,
)
from app.services.pipeline_embeddings import (
    EmbeddingSelection,
    embed_pipeline_chunks,
    resolve_embedding_selection,
)
from app.services.pipeline_storage import load_pipeline_source_markdown, store_pipeline_artifact


# Keep the runnable worker entrypoint out of this module until Task 5 adds
# packaging and upload support. The current registry guard uses the presence of
# that entrypoint to decide whether the worker may execute this pipeline kind.

_MARKDOWN_PARSER = mistune.create_markdown(renderer="ast", plugins=["table", "url"])
_ATX_HEADING_RE = re.compile(r"^(#{1,6})[ \t]+(.+?)\s*$")
_FENCE_RE = re.compile(r"^([`~]{3,})(.*)$")
_TOKEN_RE = re.compile(r"\S+")
_BLOCK_GAP_RE = re.compile(r"\n{2,}")


@dataclass(frozen=True)
class SectionRecord:
    section_id: str
    heading_level: int
    heading_path: list[str]
    title: str
    order: int
    markdown: str
    text: str


@dataclass(frozen=True)
class ChunkRecord:
    chunk_id: str
    section_id: str
    heading_path: list[str]
    title: str
    text: str
    ordinal: int
    token_count: int


@dataclass(frozen=True)
class PreparedMarkdownIndexData:
    normalized_markdown: str
    document_title: str | None
    sections: list[SectionRecord]
    chunks: list[ChunkRecord]


def run_markdown_index_builder(
    *,
    job: dict,
    set_stage: Callable[[str], None],
    heartbeat: Callable[[], None],
) -> dict[str, object]:
    pipeline_kind = str(job.get("pipeline_kind") or "markdown_index_builder")

    with pipeline_tracer.start_as_current_span("pipeline.stage.execute") as span:
        span.set_attribute("pipeline.kind", pipeline_kind)

        markdown_bytes = load_pipeline_source_markdown(
            owner_id=str(job["owner_id"]),
            source_uid=str(job["source_uid"]),
        )
        prepared = prepare_markdown_index_data(markdown_bytes, stage_callback=set_stage)
        record_pipeline_chunk_count(pipeline_kind=pipeline_kind, chunk_count=len(prepared.chunks))
        heartbeat()

        with TemporaryDirectory(prefix="markdown-index-builder-") as temp_dir_name:
            temp_dir = Path(temp_dir_name)
            lexical_path = temp_dir / "asset.lexical.sqlite"
            semantic_path = temp_dir / "asset.semantic.zip"

            _run_timed_stage(
                pipeline_kind=pipeline_kind,
                stage="lexical_indexing",
                set_stage=set_stage,
                heartbeat=heartbeat,
                fn=lambda: build_lexical_sqlite_artifact(
                    prepared,
                    output_path=lexical_path,
                    source_uid=str(job["source_uid"]),
                    pipeline_kind=pipeline_kind,
                ),
            )

            selection = _run_timed_stage(
                pipeline_kind=pipeline_kind,
                stage="embedding",
                set_stage=set_stage,
                heartbeat=heartbeat,
                fn=lambda: resolve_embedding_selection(owner_id=str(job["owner_id"])),
            )
            embeddings = _run_timed_stage(
                pipeline_kind=pipeline_kind,
                stage="embedding",
                set_stage=None,
                heartbeat=heartbeat,
                fn=lambda: embed_pipeline_chunks(
                    chunks=prepared.chunks,
                    selection=selection,
                    heartbeat=heartbeat,
                ),
            )

            def _package_and_store() -> list[str]:
                build_semantic_zip_artifact(
                    prepared,
                    embeddings=embeddings,
                    output_path=semantic_path,
                    pipeline_kind=pipeline_kind,
                    source_uid=str(job["source_uid"]),
                    embedding_provider=selection.provider,
                    embedding_model=selection.model_id,
                )

                store_pipeline_artifact(
                    job=job,
                    deliverable_kind="lexical_sqlite",
                    filename="asset.lexical.sqlite",
                    content_type="application/vnd.sqlite3",
                    local_path=lexical_path,
                    metadata_jsonb={
                        "section_count": len(prepared.sections),
                        "chunk_count": len(prepared.chunks),
                    },
                )
                store_pipeline_artifact(
                    job=job,
                    deliverable_kind="semantic_zip",
                    filename="asset.semantic.zip",
                    content_type="application/zip",
                    local_path=semantic_path,
                    metadata_jsonb={
                        "chunk_count": len(prepared.chunks),
                        "embedding_provider": selection.provider,
                        "embedding_model": selection.model_id,
                        "dimensions": int(embeddings.shape[1]) if embeddings.ndim == 2 else None,
                    },
                )
                return ["lexical_sqlite", "semantic_zip"]

            deliverable_kinds = _run_timed_stage(
                pipeline_kind=pipeline_kind,
                stage="packaging",
                set_stage=set_stage,
                heartbeat=heartbeat,
                fn=_package_and_store,
            )

    return {
        "deliverable_kinds": deliverable_kinds,
        "section_count": len(prepared.sections),
        "chunk_count": len(prepared.chunks),
        "embedding_provider": selection.provider,
        "embedding_model": selection.model_id,
    }


def prepare_markdown_index_data(
    markdown_bytes: bytes,
    *,
    stage_callback: Callable[[str], None] | None = None,
    target_chunk_tokens: int = 512,
    max_chunk_tokens: int = 1024,
) -> PreparedMarkdownIndexData:
    if target_chunk_tokens <= 0:
        raise ValueError("target_chunk_tokens must be greater than zero")
    if max_chunk_tokens < target_chunk_tokens:
        raise ValueError("max_chunk_tokens must be greater than or equal to target_chunk_tokens")

    _emit_stage(stage_callback, "parsing")
    source_markdown = _decode_markdown_bytes(markdown_bytes)
    _MARKDOWN_PARSER(source_markdown)

    _emit_stage(stage_callback, "normalizing")
    normalized_markdown = _normalize_markdown(source_markdown)

    _emit_stage(stage_callback, "structuring")
    sections = _derive_sections(normalized_markdown)

    _emit_stage(stage_callback, "chunking")
    chunks = _build_chunks(
        sections=sections,
        target_chunk_tokens=target_chunk_tokens,
        max_chunk_tokens=max_chunk_tokens,
    )

    return PreparedMarkdownIndexData(
        normalized_markdown=normalized_markdown,
        document_title=_derive_document_title(sections),
        sections=sections,
        chunks=chunks,
    )


def _emit_stage(stage_callback: Callable[[str], None] | None, stage: str) -> None:
    if stage_callback is not None:
        stage_callback(stage)


def _decode_markdown_bytes(markdown_bytes: bytes) -> str:
    try:
        return markdown_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Markdown input must be valid UTF-8") from exc


def _normalize_markdown(markdown: str) -> str:
    normalized = markdown.replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.rstrip("\n")
    return f"{normalized}\n" if normalized else "\n"


@dataclass(frozen=True)
class _HeadingMarker:
    line_index: int
    level: int
    title: str


def _derive_sections(markdown: str) -> list[SectionRecord]:
    lines = markdown.split("\n")
    headings = _scan_headings(lines)
    sections: list[SectionRecord] = []
    order = 1

    if not headings:
        text = _markdown_to_text(markdown)
        return [
            SectionRecord(
                section_id=_make_section_id(order, 0, []),
                heading_level=0,
                heading_path=[],
                title="Document",
                order=order,
                markdown=markdown.strip("\n"),
                text=text or "Document",
            )
        ]

    first_heading = headings[0]
    preamble_markdown = "\n".join(lines[: first_heading.line_index]).strip("\n")
    if preamble_markdown.strip():
        sections.append(
            SectionRecord(
                section_id=_make_section_id(order, 0, []),
                heading_level=0,
                heading_path=[],
                title="Document",
                order=order,
                markdown=preamble_markdown,
                text=_markdown_to_text(preamble_markdown) or "Document",
            )
        )
        order += 1

    heading_stack: list[tuple[int, str]] = []
    for index, heading in enumerate(headings):
        while heading_stack and heading_stack[-1][0] >= heading.level:
            heading_stack.pop()
        heading_stack.append((heading.level, heading.title))
        heading_path = [title for _, title in heading_stack]

        start_line = heading.line_index + 1
        end_line = headings[index + 1].line_index if index + 1 < len(headings) else len(lines)
        section_markdown = "\n".join(lines[start_line:end_line]).strip("\n")
        section_text = _markdown_to_text(section_markdown) or heading.title

        sections.append(
            SectionRecord(
                section_id=_make_section_id(order, heading.level, heading_path),
                heading_level=heading.level,
                heading_path=heading_path,
                title=heading.title,
                order=order,
                markdown=section_markdown,
                text=section_text,
            )
        )
        order += 1

    return sections


def _scan_headings(lines: list[str]) -> list[_HeadingMarker]:
    headings: list[_HeadingMarker] = []
    active_fence: str | None = None

    for line_index, line in enumerate(lines):
        fence_match = _FENCE_RE.match(line)
        if fence_match:
            fence_token = fence_match.group(1)
            fence_char = fence_token[0]
            if active_fence is None:
                active_fence = fence_char
            elif active_fence == fence_char:
                active_fence = None
            continue

        if active_fence is not None:
            continue

        heading_match = _ATX_HEADING_RE.match(line)
        if not heading_match:
            continue

        title = heading_match.group(2)
        title = re.sub(r"[ \t]+#+[ \t]*$", "", title).strip()
        if not title:
            continue

        headings.append(
            _HeadingMarker(
                line_index=line_index,
                level=len(heading_match.group(1)),
                title=title,
            )
        )

    return headings


def _markdown_to_text(markdown: str) -> str:
    if not markdown.strip():
        return ""

    ast = _MARKDOWN_PARSER(markdown)
    raw_text = "".join(_flatten_ast_node(node) for node in ast)
    return _normalize_text(raw_text)


def _flatten_ast_node(node: dict) -> str:
    node_type = node.get("type", "")

    if node_type == "text":
        return node.get("raw", "")
    if node_type in {"blank_line", "linebreak", "softbreak"}:
        return "\n"
    if node_type in {"block_code", "codespan", "block_text"}:
        return f"{node.get('raw', '').strip()}\n"
    if node_type == "link":
        label = "".join(_flatten_ast_node(child) for child in node.get("children", []))
        return label or node.get("attrs", {}).get("url", "")
    if node_type == "image":
        label = "".join(_flatten_ast_node(child) for child in node.get("children", []))
        return label or node.get("attrs", {}).get("url", "")
    if node_type == "table_row":
        cells = [_flatten_ast_node(child).strip() for child in node.get("children", [])]
        return " | ".join(cell for cell in cells if cell) + "\n"
    if node_type == "list_item":
        body = _normalize_text("".join(_flatten_ast_node(child) for child in node.get("children", [])))
        return f"{body}\n" if body else ""

    children = node.get("children", [])
    text = "".join(_flatten_ast_node(child) for child in children)

    if node_type in {
        "paragraph",
        "heading",
        "list",
        "block_quote",
        "table",
        "table_head",
        "table_body",
    }:
        stripped = text.strip()
        return f"{stripped}\n\n" if stripped else ""

    return text


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]

    collapsed: list[str] = []
    previous_blank = False
    for line in normalized_lines:
        if not line:
            if not previous_blank:
                collapsed.append("")
            previous_blank = True
            continue

        collapsed.append(line)
        previous_blank = False

    return "\n".join(collapsed).strip()


def _make_section_id(order: int, heading_level: int, heading_path: list[str]) -> str:
    digest_source = f"{order}|{heading_level}|{' > '.join(heading_path)}"
    digest = sha1(digest_source.encode("utf-8")).hexdigest()[:12]
    return f"sec_{order:04d}_{digest}"


def _build_chunks(
    *,
    sections: list[SectionRecord],
    target_chunk_tokens: int,
    max_chunk_tokens: int,
) -> list[ChunkRecord]:
    chunks: list[ChunkRecord] = []
    ordinal = 1

    for section in sections:
        section_blocks = [block.strip() for block in _BLOCK_GAP_RE.split(section.text) if block.strip()]
        if not section_blocks:
            section_blocks = [section.title]

        current_tokens: list[str] = []
        current_parts: list[str] = []

        def flush_current() -> None:
            nonlocal ordinal
            if not current_tokens:
                return
            chunk_text = " ".join(current_parts).strip()
            chunks.append(
                ChunkRecord(
                    chunk_id=_make_chunk_id(section.section_id, ordinal, chunk_text),
                    section_id=section.section_id,
                    heading_path=list(section.heading_path),
                    title=section.title,
                    text=chunk_text,
                    ordinal=ordinal,
                    token_count=len(current_tokens),
                )
            )
            ordinal += 1
            current_tokens.clear()
            current_parts.clear()

        for block in section_blocks:
            block_tokens = _TOKEN_RE.findall(block)
            if not block_tokens:
                continue

            if len(block_tokens) > max_chunk_tokens:
                flush_current()
                for start in range(0, len(block_tokens), max_chunk_tokens):
                    token_slice = block_tokens[start : start + max_chunk_tokens]
                    chunk_text = " ".join(token_slice)
                    chunks.append(
                        ChunkRecord(
                            chunk_id=_make_chunk_id(section.section_id, ordinal, chunk_text),
                            section_id=section.section_id,
                            heading_path=list(section.heading_path),
                            title=section.title,
                            text=chunk_text,
                            ordinal=ordinal,
                            token_count=len(token_slice),
                        )
                    )
                    ordinal += 1
                continue

            projected_size = len(current_tokens) + len(block_tokens)
            if current_tokens and projected_size > target_chunk_tokens:
                flush_current()

            current_tokens.extend(block_tokens)
            current_parts.append(block)

        flush_current()

    return chunks


def _make_chunk_id(section_id: str, ordinal: int, text: str) -> str:
    digest_source = f"{section_id}|{ordinal}|{text}"
    digest = sha1(digest_source.encode("utf-8")).hexdigest()[:12]
    return f"chk_{ordinal:04d}_{digest}"


def _derive_document_title(sections: list[SectionRecord]) -> str | None:
    for section in sections:
        if section.heading_level == 1:
            return section.title
    return sections[0].title if sections else None


def build_lexical_sqlite_artifact(
    prepared: PreparedMarkdownIndexData,
    *,
    output_path: str | Path,
    source_uid: str,
    pipeline_kind: str,
) -> Path:
    path = Path(output_path)
    if path.exists():
        path.unlink()

    conn = sqlite3.connect(str(path))
    try:
        conn.executescript(
            """
            PRAGMA journal_mode = OFF;
            CREATE TABLE document (
              document_id TEXT PRIMARY KEY,
              source_uid TEXT NOT NULL,
              pipeline_kind TEXT NOT NULL,
              title TEXT,
              normalized_markdown TEXT NOT NULL,
              section_count INTEGER NOT NULL,
              chunk_count INTEGER NOT NULL
            );
            CREATE TABLE sections (
              section_id TEXT PRIMARY KEY,
              heading_level INTEGER NOT NULL,
              heading_path TEXT NOT NULL,
              title TEXT NOT NULL,
              section_order INTEGER NOT NULL,
              markdown TEXT NOT NULL,
              text TEXT NOT NULL
            );
            CREATE TABLE chunks (
              chunk_id TEXT PRIMARY KEY,
              section_id TEXT NOT NULL,
              heading_path TEXT NOT NULL,
              title TEXT NOT NULL,
              text TEXT NOT NULL,
              ordinal INTEGER NOT NULL,
              token_count INTEGER NOT NULL
            );
            CREATE VIRTUAL TABLE chunks_fts USING fts5(
              chunk_id UNINDEXED,
              title,
              heading_path,
              text
            );
            CREATE TABLE manifest (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            INSERT INTO document (
              document_id, source_uid, pipeline_kind, title, normalized_markdown, section_count, chunk_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "document-1",
                source_uid,
                pipeline_kind,
                prepared.document_title,
                prepared.normalized_markdown,
                len(prepared.sections),
                len(prepared.chunks),
            ),
        )
        conn.executemany(
            """
            INSERT INTO sections (
              section_id, heading_level, heading_path, title, section_order, markdown, text
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    section.section_id,
                    section.heading_level,
                    json.dumps(section.heading_path),
                    section.title,
                    section.order,
                    section.markdown,
                    section.text,
                )
                for section in prepared.sections
            ],
        )
        conn.executemany(
            """
            INSERT INTO chunks (
              chunk_id, section_id, heading_path, title, text, ordinal, token_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    chunk.chunk_id,
                    chunk.section_id,
                    json.dumps(chunk.heading_path),
                    chunk.title,
                    chunk.text,
                    chunk.ordinal,
                    chunk.token_count,
                )
                for chunk in prepared.chunks
            ],
        )
        conn.executemany(
            "INSERT INTO chunks_fts (chunk_id, title, heading_path, text) VALUES (?, ?, ?, ?)",
            [
                (
                    chunk.chunk_id,
                    chunk.title,
                    " > ".join(chunk.heading_path),
                    chunk.text,
                )
                for chunk in prepared.chunks
            ],
        )
        manifest_rows = {
            "pipeline_kind": pipeline_kind,
            "source_uid": source_uid,
            "document_title": prepared.document_title or "",
            "section_count": str(len(prepared.sections)),
            "chunk_count": str(len(prepared.chunks)),
        }
        conn.executemany(
            "INSERT INTO manifest (key, value) VALUES (?, ?)",
            list(manifest_rows.items()),
        )
        conn.commit()
    finally:
        conn.close()

    return path


def build_semantic_zip_artifact(
    prepared: PreparedMarkdownIndexData,
    *,
    embeddings: np.ndarray,
    output_path: str | Path,
    pipeline_kind: str,
    source_uid: str,
    embedding_provider: str,
    embedding_model: str,
) -> Path:
    path = Path(output_path)
    manifest = {
        "pipeline_kind": pipeline_kind,
        "source_uid": source_uid,
        "document_title": prepared.document_title,
        "section_count": len(prepared.sections),
        "chunk_count": len(prepared.chunks),
        "embedding_provider": embedding_provider,
        "embedding_model": embedding_model,
        "dimensions": int(embeddings.shape[1]) if embeddings.ndim == 2 else 0,
    }
    chunk_id_map = {chunk.chunk_id: index for index, chunk in enumerate(prepared.chunks)}
    chunk_lines = [
        json.dumps(
            {
                "chunk_id": chunk.chunk_id,
                "section_id": chunk.section_id,
                "heading_path": chunk.heading_path,
                "title": chunk.title,
                "text": chunk.text,
                "ordinal": chunk.ordinal,
                "token_count": chunk.token_count,
            },
            ensure_ascii=True,
        )
        for chunk in prepared.chunks
    ]

    embeddings_buffer = np.asarray(embeddings, dtype=np.float32)
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
        archive.writestr("chunks.jsonl", "\n".join(chunk_lines) + ("\n" if chunk_lines else ""))
        archive.writestr("chunk_id_map.json", json.dumps(chunk_id_map, indent=2, sort_keys=True))

        with archive.open("embeddings.npy", "w") as embedding_file:
            np.save(embedding_file, embeddings_buffer)

    return path


def _run_timed_stage(
    *,
    pipeline_kind: str,
    stage: str,
    set_stage: Callable[[str], None] | None,
    heartbeat: Callable[[], None],
    fn: Callable[[], object],
) -> object:
    started = perf_counter()
    if set_stage is not None:
        set_stage(stage)
    heartbeat()
    result = fn()
    heartbeat()
    record_pipeline_stage_duration(
        pipeline_kind=pipeline_kind,
        stage=stage,
        duration_ms=(perf_counter() - started) * 1000.0,
    )
    return result

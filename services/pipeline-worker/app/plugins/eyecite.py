"""eyecite plugins — legal citation extraction, resolution, and annotation."""

import json
import logging
from typing import Any

from ..shared.base import BasePlugin, PluginOutput
from ..shared import output as out

logger = logging.getLogger("eyecite-plugin")


def _serialize_citation(cite) -> dict:
    """Convert an eyecite citation object to a JSON-safe dict."""
    d = cite.dump()
    d["type"] = cite.__class__.__name__
    d["matched_text"] = cite.matched_text()
    d["span"] = list(cite.span())
    d["full_span"] = list(cite.full_span())
    if hasattr(cite, "corrected_citation"):
        d["corrected_citation"] = cite.corrected_citation()
    if hasattr(cite, "corrected_citation_full"):
        d["corrected_citation_full"] = cite.corrected_citation_full()
    return d


def _serialize_resolutions(resolutions: dict) -> list[dict]:
    """Convert resolve_citations() output to a JSON-safe list."""
    results = []
    for resource, cites in resolutions.items():
        results.append({
            "resource": str(resource),
            "citation_count": len(cites),
            "citations": [_serialize_citation(c) for c in cites],
        })
    return results


class CleanTextPlugin(BasePlugin):
    """Pre-process text before citation extraction."""

    task_types = ["blockdata.eyecite.clean"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from eyecite import clean_text

        text = params.get("text", "")
        if not text:
            return out.failed("text is required")

        steps = params.get("steps", ["html", "inline_whitespace"])
        if isinstance(steps, str):
            steps = json.loads(steps)

        cleaned = clean_text(text, steps)
        return out.success(
            data={"cleaned_text": cleaned, "original_length": len(text), "cleaned_length": len(cleaned)},
            logs=[f"Cleaned text: {len(text)} → {len(cleaned)} chars using steps {steps}"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "text", "type": "string", "required": True, "description": "Raw input text (may contain HTML)."},
            {"name": "steps", "type": "json", "required": False, "default": ["html", "inline_whitespace"],
             "description": "Ordered list of cleaner names: html, inline_whitespace, all_whitespace, underscores, xml."},
        ]


class ExtractCitationsPlugin(BasePlugin):
    """Extract legal citations from text."""

    task_types = ["blockdata.eyecite.extract"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from eyecite import get_citations

        text = params.get("text", "")
        if not text:
            return out.failed("text is required")

        markup_text = params.get("markup_text", "")
        remove_ambiguous = params.get("remove_ambiguous", False)
        clean_steps = params.get("clean_steps")
        if isinstance(clean_steps, str):
            clean_steps = json.loads(clean_steps)

        kwargs: dict[str, Any] = {
            "plain_text": text,
            "remove_ambiguous": bool(remove_ambiguous),
        }
        if markup_text:
            kwargs["markup_text"] = markup_text
        if clean_steps is not None:
            kwargs["clean_steps"] = clean_steps

        citations = get_citations(**kwargs)
        serialized = [_serialize_citation(c) for c in citations]

        # Optionally resolve in one shot
        if params.get("resolve", False):
            from eyecite import resolve_citations
            resolutions = resolve_citations(citations)
            resolved = _serialize_resolutions(resolutions)
        else:
            resolved = None

        data: dict[str, Any] = {
            "citations": serialized,
            "count": len(serialized),
        }
        if resolved is not None:
            data["resolutions"] = resolved
            data["unique_resources"] = len(resolved)

        return out.success(
            data=data,
            logs=[f"Found {len(serialized)} citations" + (f", resolved to {len(resolved)} resources" if resolved else "")],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "text", "type": "string", "required": True, "description": "Plain text to extract citations from."},
            {"name": "markup_text", "type": "string", "required": False, "description": "Original HTML/XML for markup-aware extraction."},
            {"name": "clean_steps", "type": "json", "required": False, "description": "Cleaning steps to apply before extraction."},
            {"name": "remove_ambiguous", "type": "boolean", "required": False, "default": False, "description": "Drop citations with ambiguous reporters."},
            {"name": "resolve", "type": "boolean", "required": False, "default": False, "description": "Also resolve citations after extraction."},
        ]


class ResolveCitationsPlugin(BasePlugin):
    """Resolve short-form, supra, id, and reference citations to their full citation."""

    task_types = ["blockdata.eyecite.resolve"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from eyecite import get_citations, resolve_citations

        text = params.get("text", "")
        if not text:
            return out.failed("text is required")

        clean_steps = params.get("clean_steps")
        if isinstance(clean_steps, str):
            clean_steps = json.loads(clean_steps)

        kwargs: dict[str, Any] = {"plain_text": text}
        if clean_steps is not None:
            kwargs["clean_steps"] = clean_steps

        citations = get_citations(**kwargs)
        resolutions = resolve_citations(citations)
        resolved = _serialize_resolutions(resolutions)

        return out.success(
            data={
                "resolutions": resolved,
                "unique_resources": len(resolved),
                "total_citations": sum(r["citation_count"] for r in resolved),
            },
            logs=[f"Resolved {len(citations)} citations to {len(resolved)} unique resources"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "text", "type": "string", "required": True, "description": "Text containing citations to resolve."},
            {"name": "clean_steps", "type": "json", "required": False, "description": "Cleaning steps to apply before extraction."},
        ]


class AnnotateCitationsPlugin(BasePlugin):
    """Insert markup around citation spans in text."""

    task_types = ["blockdata.eyecite.annotate"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from eyecite import get_citations, annotate_citations

        text = params.get("text", "")
        if not text:
            return out.failed("text is required")

        source_text = params.get("source_text", "")
        before_tag = params.get("before_tag", '<span class="citation">')
        after_tag = params.get("after_tag", "</span>")
        unbalanced_tags = params.get("unbalanced_tags", "skip")

        clean_steps = params.get("clean_steps")
        if isinstance(clean_steps, str):
            clean_steps = json.loads(clean_steps)

        kwargs: dict[str, Any] = {"plain_text": text}
        if clean_steps is not None:
            kwargs["clean_steps"] = clean_steps

        citations = get_citations(**kwargs)
        annotations = [
            (c.span(), before_tag, after_tag)
            for c in citations
        ]

        annotate_kwargs: dict[str, Any] = {
            "plain_text": text,
            "annotations": annotations,
            "unbalanced_tags": unbalanced_tags,
        }
        if source_text:
            annotate_kwargs["source_text"] = source_text

        annotated = annotate_citations(**annotate_kwargs)

        return out.success(
            data={
                "annotated_text": annotated,
                "citation_count": len(citations),
            },
            logs=[f"Annotated {len(citations)} citations"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "text", "type": "string", "required": True, "description": "Plain text to annotate."},
            {"name": "source_text", "type": "string", "required": False, "description": "Original HTML — annotations land in correct positions via diff."},
            {"name": "before_tag", "type": "string", "required": False, "default": '<span class="citation">', "description": "HTML inserted before each citation."},
            {"name": "after_tag", "type": "string", "required": False, "default": "</span>", "description": "HTML inserted after each citation."},
            {"name": "unbalanced_tags", "type": "enum", "required": False, "default": "skip", "values": ["unchecked", "skip", "wrap"], "description": "How to handle unbalanced HTML tags."},
            {"name": "clean_steps", "type": "json", "required": False, "description": "Cleaning steps to apply before extraction."},
        ]


class PipelinePlugin(BasePlugin):
    """Full eyecite pipeline: clean → extract → resolve → annotate."""

    task_types = ["blockdata.eyecite.pipeline"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from eyecite import clean_text, get_citations, resolve_citations, annotate_citations

        text = params.get("text", "")
        if not text:
            return out.failed("text is required")

        steps = params.get("clean_steps", ["html", "inline_whitespace"])
        if isinstance(steps, str):
            steps = json.loads(steps)

        remove_ambiguous = params.get("remove_ambiguous", False)
        do_annotate = params.get("annotate", False)
        output_format = params.get("output_format", "full")

        logs: list[str] = []

        # 1. Clean
        cleaned = clean_text(text, steps)
        logs.append(f"Cleaned: {len(text)} → {len(cleaned)} chars")

        # 2. Extract
        citations = get_citations(plain_text=cleaned, remove_ambiguous=bool(remove_ambiguous))
        serialized = [_serialize_citation(c) for c in citations]
        logs.append(f"Extracted: {len(serialized)} citations")

        # 3. Resolve
        resolutions = resolve_citations(citations)
        resolved = _serialize_resolutions(resolutions)
        logs.append(f"Resolved: {len(resolved)} unique resources")

        # 4. Annotate (optional)
        annotated_text = None
        if do_annotate:
            before_tag = params.get("before_tag", '<span class="citation">')
            after_tag = params.get("after_tag", "</span>")
            annotations = [(c.span(), before_tag, after_tag) for c in citations]
            annotated_text = annotate_citations(
                plain_text=cleaned,
                annotations=annotations,
                unbalanced_tags="skip",
            )
            logs.append(f"Annotated: {len(annotations)} spans")

        # Build response based on output_format
        data: dict[str, Any] = {}
        if output_format == "citations_only":
            data = {"citations": serialized, "count": len(serialized)}
        elif output_format == "resolved_only":
            data = {"resolutions": resolved, "unique_resources": len(resolved)}
        elif output_format == "annotated_only":
            data = {"annotated_text": annotated_text or cleaned}
        else:  # "full"
            data = {
                "cleaned_text": cleaned,
                "citations": serialized,
                "count": len(serialized),
                "resolutions": resolved,
                "unique_resources": len(resolved),
            }
            if annotated_text is not None:
                data["annotated_text"] = annotated_text

        return out.success(data=data, logs=logs)

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "text", "type": "string", "required": True, "description": "Raw text (may contain HTML)."},
            {"name": "clean_steps", "type": "json", "required": False, "default": ["html", "inline_whitespace"], "description": "Cleaning pipeline."},
            {"name": "remove_ambiguous", "type": "boolean", "required": False, "default": False, "description": "Drop ambiguous reporter citations."},
            {"name": "annotate", "type": "boolean", "required": False, "default": False, "description": "Return annotated text with citation markup."},
            {"name": "before_tag", "type": "string", "required": False, "default": '<span class="citation">', "description": "HTML before each citation (when annotate=true)."},
            {"name": "after_tag", "type": "string", "required": False, "default": "</span>", "description": "HTML after each citation (when annotate=true)."},
            {"name": "output_format", "type": "enum", "required": False, "default": "full", "values": ["full", "citations_only", "resolved_only", "annotated_only"], "description": "What to include in the response."},
        ]
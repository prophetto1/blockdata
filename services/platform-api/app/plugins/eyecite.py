"""eyecite plugins — legal citation extraction, resolution, and annotation."""

import json
import logging
from typing import Any

from app.domain.plugins.models import BasePlugin, PluginOutput
from app.domain.plugins import models as out

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


# ---------------------------------------------------------------------------
# Reference data plugins — reporters-db, courts-db
# ---------------------------------------------------------------------------

def _serialize_reporter_entry(key: str, entry: dict) -> dict:
    """Convert a reporters-db entry to a JSON-safe dict."""
    editions = {}
    for ed_key, ed_val in entry.get("editions", {}).items():
        editions[ed_key] = {
            "start": ed_val["start"].isoformat() if ed_val.get("start") else None,
            "end": ed_val["end"].isoformat() if ed_val.get("end") else None,
        }
    return {
        "abbreviation": key,
        "name": entry.get("name", ""),
        "cite_type": entry.get("cite_type", ""),
        "publisher": entry.get("publisher"),
        "editions": editions,
        "variations": entry.get("variations", {}),
        "examples": entry.get("examples", []),
        "mlz_jurisdiction": entry.get("mlz_jurisdiction", []),
    }


def _serialize_court(court: dict) -> dict:
    """Convert a courts-db court record to a JSON-safe dict."""
    return {
        "id": court.get("id", ""),
        "name": court.get("name", ""),
        "name_abbreviation": court.get("name_abbreviation"),
        "citation_string": court.get("citation_string", ""),
        "court_url": court.get("court_url"),
        "location": court.get("location", ""),
        "jurisdiction": court.get("jurisdiction", ""),
        "system": court.get("system", ""),
        "level": court.get("level", ""),
        "type": court.get("type", ""),
        "dates": court.get("dates", []),
        "parent": court.get("parent"),
        "appeal_to": court.get("appeal_to"),
        "federal_circuit": court.get("federal_circuit"),
        "examples": court.get("examples", []),
    }


class ReporterLookupPlugin(BasePlugin):
    """Query the reporters-db database — 1,167 reporters, 2,102 variations."""

    task_types = ["blockdata.eyecite.reporters"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from reporters_db import (
            REPORTERS, LAWS, JOURNALS,
            VARIATIONS_ONLY, EDITIONS, NAMES_TO_EDITIONS,
        )

        query = params.get("query", "").strip()
        cite_type = params.get("cite_type", "")
        category = params.get("category", "all")
        include_variations = params.get("include_variations", False)
        limit = params.get("limit", 50)

        # Select source databases
        sources: dict[str, dict] = {}
        if category in ("all", "reporters"):
            sources["reporters"] = REPORTERS
        if category in ("all", "laws"):
            sources["laws"] = LAWS
        if category in ("all", "journals"):
            sources["journals"] = JOURNALS

        results: list[dict] = []

        for cat_name, db in sources.items():
            for key, entries in db.items():
                for entry in entries:
                    # Filter by cite_type
                    if cite_type and entry.get("cite_type", "") != cite_type:
                        continue

                    # Filter by query (match abbreviation, name, or variation)
                    if query:
                        q = query.lower()
                        match = (
                            q in key.lower()
                            or q in entry.get("name", "").lower()
                            or any(q in v.lower() for v in entry.get("variations", {}))
                        )
                        if not match:
                            continue

                    record = _serialize_reporter_entry(key, entry)
                    record["category"] = cat_name
                    if not include_variations:
                        record.pop("variations", None)
                    results.append(record)

                    if len(results) >= limit:
                        break
                if len(results) >= limit:
                    break
            if len(results) >= limit:
                break

        # If query looks like a variation, also check VARIATIONS_ONLY
        variation_match = None
        if query and query in VARIATIONS_ONLY:
            variation_match = {
                "variation": query,
                "canonical_reporters": VARIATIONS_ONLY[query],
            }

        # If query looks like an edition, check EDITIONS
        edition_match = None
        if query and query in EDITIONS:
            edition_match = {
                "edition": query,
                "root_reporter": EDITIONS[query],
            }

        data: dict[str, Any] = {
            "results": results,
            "count": len(results),
            "truncated": len(results) >= limit,
        }
        if variation_match:
            data["variation_match"] = variation_match
        if edition_match:
            data["edition_match"] = edition_match

        return out.success(
            data=data,
            logs=[f"Found {len(results)} reporters matching query={query!r} cite_type={cite_type!r} category={category}"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "query", "type": "string", "required": False, "description": "Search term — matches against abbreviation, full name, and variations. Empty returns all."},
            {"name": "cite_type", "type": "enum", "required": False, "values": ["federal", "state", "neutral", "specialty", "specialty_west", "specialty_lexis", "state_regional", "scotus_early"], "description": "Filter by citation type."},
            {"name": "category", "type": "enum", "required": False, "default": "all", "values": ["all", "reporters", "laws", "journals"], "description": "Which database to search: case reporters, statutory sources, journals, or all."},
            {"name": "include_variations", "type": "boolean", "required": False, "default": False, "description": "Include the full variation-to-edition mapping in results."},
            {"name": "limit", "type": "integer", "required": False, "default": 50, "description": "Max results to return."},
        ]


class CourtLookupPlugin(BasePlugin):
    """Query the courts-db database — ~400 US courts with hierarchy and date ranges."""

    task_types = ["blockdata.eyecite.courts"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from courts_db import courts as all_courts, court_dict, find_court

        query = params.get("query", "").strip()
        court_id = params.get("court_id", "").strip()
        system = params.get("system", "")
        level = params.get("level", "")
        court_type = params.get("type", "")
        location = params.get("location", "")
        parent = params.get("parent", "")
        limit = params.get("limit", 50)

        # Direct ID lookup — return single court with children and appeals path
        if court_id:
            court = court_dict.get(court_id)
            if not court:
                return out.failed(f"No court with id: {court_id}")
            record = _serialize_court(court)
            # Find children
            children = [
                {"id": c["id"], "name": c["name"]}
                for c in all_courts
                if c.get("parent") == court_id
            ]
            if children:
                record["children"] = children
            # Build appeals chain
            appeals_chain = []
            current = court
            while current.get("appeal_to"):
                next_id = current["appeal_to"]
                next_court = court_dict.get(next_id)
                if not next_court or next_id in [a["id"] for a in appeals_chain]:
                    break
                appeals_chain.append({"id": next_id, "name": next_court["name"]})
                current = next_court
            if appeals_chain:
                record["appeals_chain"] = appeals_chain
            return out.success(data=record, logs=[f"Court lookup: {court_id}"])

        # String-based court resolution via find_court()
        if query:
            matched_ids = find_court(query, location=location or None)
            results = []
            for cid in matched_ids[:limit]:
                court = court_dict.get(cid)
                if court:
                    results.append(_serialize_court(court))
            return out.success(
                data={"results": results, "count": len(results), "query": query},
                logs=[f"find_court({query!r}) → {len(results)} matches"],
            )

        # Filter-based browsing
        results = []
        for court in all_courts:
            if system and court.get("system", "") != system:
                continue
            if level and court.get("level", "") != level:
                continue
            if court_type and court.get("type", "") != court_type:
                continue
            if location and location.lower() not in court.get("location", "").lower():
                continue
            if parent and court.get("parent", "") != parent:
                continue
            results.append(_serialize_court(court))
            if len(results) >= limit:
                break

        return out.success(
            data={"results": results, "count": len(results), "truncated": len(results) >= limit},
            logs=[f"Found {len(results)} courts (system={system!r} level={level!r} type={court_type!r} location={location!r})"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "query", "type": "string", "required": False, "description": "Court name or string to resolve (e.g. 'Second Circuit', 'S.D.N.Y.'). Uses find_court() regex matching."},
            {"name": "court_id", "type": "string", "required": False, "description": "Direct court ID lookup (e.g. 'scotus', 'ca2', 'cacd'). Returns full record with children and appeals chain."},
            {"name": "system", "type": "enum", "required": False, "values": ["federal", "state", "tribal"], "description": "Filter by court system."},
            {"name": "level", "type": "enum", "required": False, "values": ["colr", "iac", "gjc", "ljc"], "description": "Filter by court level: colr (last resort/supreme), iac (intermediate appellate), gjc (general jurisdiction/trial), ljc (limited jurisdiction)."},
            {"name": "type", "type": "enum", "required": False, "values": ["trial", "appellate", "bankruptcy", "ag"], "description": "Filter by court type."},
            {"name": "location", "type": "string", "required": False, "description": "Filter by location (e.g. 'California', 'New York'). Case-insensitive partial match."},
            {"name": "parent", "type": "string", "required": False, "description": "Filter by parent court ID (e.g. 'ca9' to find all courts under the 9th Circuit)."},
            {"name": "limit", "type": "integer", "required": False, "default": 50, "description": "Max results to return."},
        ]


class DatabaseStatsPlugin(BasePlugin):
    """Summary statistics across all eyecite reference databases."""

    task_types = ["blockdata.eyecite.stats"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        from reporters_db import REPORTERS, LAWS, JOURNALS, VARIATIONS_ONLY, EDITIONS
        from courts_db import courts as all_courts

        # Reporter stats
        reporter_count = sum(len(entries) for entries in REPORTERS.values())
        law_count = sum(len(entries) for entries in LAWS.values())
        journal_count = sum(len(entries) for entries in JOURNALS.values())

        # Cite type distribution
        cite_types: dict[str, int] = {}
        for entries in REPORTERS.values():
            for entry in entries:
                ct = entry.get("cite_type", "unknown")
                cite_types[ct] = cite_types.get(ct, 0) + 1

        # Court stats
        court_systems: dict[str, int] = {}
        court_levels: dict[str, int] = {}
        court_types: dict[str, int] = {}
        court_locations: dict[str, int] = {}
        for court in all_courts:
            s = court.get("system", "unknown")
            court_systems[s] = court_systems.get(s, 0) + 1
            lv = court.get("level", "unknown")
            court_levels[lv] = court_levels.get(lv, 0) + 1
            t = court.get("type", "unknown")
            court_types[t] = court_types.get(t, 0) + 1
            loc = court.get("location", "unknown")
            court_locations[loc] = court_locations.get(loc, 0) + 1

        data = {
            "reporters": {
                "abbreviations": len(REPORTERS),
                "entries": reporter_count,
                "variations": len(VARIATIONS_ONLY),
                "editions": len(EDITIONS),
                "by_cite_type": cite_types,
            },
            "laws": {
                "abbreviations": len(LAWS),
                "entries": law_count,
            },
            "journals": {
                "abbreviations": len(JOURNALS),
                "entries": journal_count,
            },
            "courts": {
                "total": len(all_courts),
                "by_system": court_systems,
                "by_level": court_levels,
                "by_type": court_types,
                "by_location": court_locations,
            },
        }

        return out.success(data=data, logs=["Database stats compiled"])

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return []
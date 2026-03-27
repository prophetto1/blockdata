"""InputAssembler: constructs fenced-window messages per the prompt protocol.

Window order (from prompts_v1.0.md):
  0. ENV (system-level metadata)
  1. ANCHOR_PACK (anchor text + metadata)
  2. EVIDENCE_PACK (research pack authorities, only when p2 admitted)
  3. CARRY_FORWARD (prior sanitized model outputs)
  4. TASK (the prompt template with placeholders resolved)
  5. OUTPUT_GUARD (format enforcement)
"""

from __future__ import annotations

import json
from typing import Any


def _fence(name: str, content: str) -> str:
    return f"<<<BEGIN_{name}>>>\n{content}\n<<<END_{name}>>>"


def _format_anchor_pack(p1: dict[str, Any]) -> str:
    anchor = p1.get("content", {}).get("anchor", {})
    lines = [
        f"anchor_caseId: {anchor.get('caseId', '')}",
        f"anchor_usCite: {anchor.get('usCite', '')}",
        f"anchor_caseName: {anchor.get('caseName', '')}",
        f"anchor_term: {anchor.get('term', '')}",
        "",
        "[ANCHOR_TEXT]",
        anchor.get("text", ""),
    ]
    return _fence("ANCHOR_PACK", "\n".join(lines))


def _format_evidence_pack(p2: dict[str, Any]) -> str:
    authorities = p2.get("content", {}).get("authorities", [])
    parts = ["# Admitted Authorities\n"]
    for auth in authorities:
        parts.append(f"## {auth.get('caseName', 'Unknown')} ({auth.get('usCite') or auth.get('capCite', 'N/A')})")
        parts.append(auth.get("text", "(no text)"))
        parts.append("")
    return _fence("EVIDENCE_PACK", "\n".join(parts))


def _format_carry_forward(state: dict[str, Any]) -> str:
    if not state:
        return ""
    return _fence("CARRY_FORWARD", json.dumps(state, indent=2, ensure_ascii=False))


def _resolve_placeholders(template: str, p1: dict[str, Any], p2: dict[str, Any] | None) -> str:
    """Resolve prompt template placeholders with actual values."""
    anchor = p1.get("content", {}).get("anchor", {})
    replacements = {
        "{anchor_text}": anchor.get("text", ""),
        "{anchor_us_cite}": anchor.get("usCite", ""),
        "{anchor_case_name}": anchor.get("caseName", ""),
        "{anchor_term}": str(anchor.get("term", "")),
    }
    if p2 is not None:
        authorities = p2.get("content", {}).get("authorities", [])
        rp_parts = []
        for auth in authorities:
            cite = auth.get("usCite") or auth.get("capCite", "N/A")
            rp_parts.append(f"--- {auth.get('caseName', 'Unknown')} ({cite}) ---")
            rp_parts.append(auth.get("text", "(no text)"))
            rp_parts.append("")
        replacements["{research_pack_content}"] = "\n".join(rp_parts)
    else:
        replacements["{research_pack_content}"] = ""

    result = template
    for key, val in replacements.items():
        result = result.replace(key, val)
    return result


def build_messages(
    *,
    step_def: dict[str, Any],
    payloads: dict[str, dict[str, Any]],
    candidate_state: dict[str, Any],
    system_message: str,
) -> list[dict[str, str]]:
    """Build the fenced-window message list for a model call.

    Returns list of dicts with 'role' and 'content' keys.
    """
    messages: list[dict[str, str]] = []

    # System message (constant)
    messages.append({"role": "system", "content": system_message})

    p1 = payloads.get("p1")
    p2 = payloads.get("p2")

    # Window 0: ENV
    env_lines = [
        "benchmark: Legal-10",
        f"step_id: {step_def.get('step_id', '')}",
        f"mode: {'open-book' if p2 else 'closed-book'}",
        "session_cut: true",
    ]
    messages.append({"role": "user", "content": _fence("ENV", "\n".join(env_lines))})

    # Window 1: ANCHOR_PACK
    if p1:
        messages.append({"role": "user", "content": _format_anchor_pack(p1)})

    # Window 2: EVIDENCE_PACK (only when p2 admitted)
    if p2:
        messages.append({"role": "user", "content": _format_evidence_pack(p2)})

    # Window 3: CARRY_FORWARD (only when state exists)
    if candidate_state:
        cf = _format_carry_forward(candidate_state)
        if cf:
            messages.append({"role": "user", "content": cf})

    # Window 4: TASK (prompt with resolved placeholders)
    prompt_template = step_def.get("prompt_template", "")
    resolved_prompt = _resolve_placeholders(prompt_template, p1 or {}, p2)
    messages.append({"role": "user", "content": _fence("TASK", resolved_prompt)})

    # Window 5: OUTPUT_GUARD
    messages.append({"role": "user", "content": _fence(
        "OUTPUT_GUARD",
        "Return ONLY the JSON response required by the task.\nNo prose outside JSON. No markdown fences."
    )})

    return messages

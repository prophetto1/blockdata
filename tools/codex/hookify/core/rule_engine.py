#!/usr/bin/env python3
"""Rule evaluation engine for the Codex hookify compatibility layer."""

from __future__ import annotations

import re
import sys
from functools import lru_cache
from typing import Any, Dict, List, Optional

from core.config_loader import Condition, Rule


@lru_cache(maxsize=128)
def compile_regex(pattern: str) -> re.Pattern[str]:
    """Compile regex patterns with caching."""

    return re.compile(pattern, re.IGNORECASE)


class RuleEngine:
    """Evaluates hookify rules against normalized event payloads."""

    def evaluate_rules(self, rules: List[Rule], input_data: Dict[str, Any]) -> Dict[str, Any]:
        hook_event = input_data.get("hook_event_name", "")
        blocking_rules: List[Rule] = []
        warning_rules: List[Rule] = []

        for rule in rules:
            if self._rule_matches(rule, input_data):
                if rule.action == "block":
                    blocking_rules.append(rule)
                else:
                    warning_rules.append(rule)

        if blocking_rules:
            messages = [f"**[{rule.name}]**\n{rule.message}" for rule in blocking_rules]
            combined_message = "\n\n".join(messages)

            if hook_event == "Stop":
                return {
                    "decision": "block",
                    "reason": combined_message,
                    "systemMessage": combined_message,
                }

            if hook_event in ("PreToolUse", "PostToolUse"):
                return {
                    "hookSpecificOutput": {
                        "hookEventName": hook_event,
                        "permissionDecision": "deny",
                    },
                    "systemMessage": combined_message,
                }

            return {"systemMessage": combined_message}

        if warning_rules:
            return {
                "systemMessage": "\n\n".join(
                    f"**[{rule.name}]**\n{rule.message}" for rule in warning_rules
                )
            }

        return {}

    def _rule_matches(self, rule: Rule, input_data: Dict[str, Any]) -> bool:
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        if rule.tool_matcher and not self._matches_tool(rule.tool_matcher, tool_name):
            return False

        if not rule.conditions:
            return False

        for condition in rule.conditions:
            if not self._check_condition(condition, tool_name, tool_input, input_data):
                return False

        return True

    @staticmethod
    def _matches_tool(matcher: str, tool_name: str) -> bool:
        if matcher == "*":
            return True
        return tool_name in matcher.split("|")

    def _check_condition(
        self,
        condition: Condition,
        tool_name: str,
        tool_input: Dict[str, Any],
        input_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        field_value = self._extract_field(condition.field, tool_name, tool_input, input_data)
        if field_value is None:
            return False

        operator = condition.operator
        pattern = condition.pattern

        if operator == "regex_match":
            return self._regex_match(pattern, field_value)
        if operator == "contains":
            return pattern in field_value
        if operator == "equals":
            return pattern == field_value
        if operator == "not_contains":
            return pattern not in field_value
        if operator == "starts_with":
            return field_value.startswith(pattern)
        if operator == "ends_with":
            return field_value.endswith(pattern)
        return False

    def _extract_field(
        self,
        field: str,
        tool_name: str,
        tool_input: Dict[str, Any],
        input_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        if field in tool_input:
            value = tool_input[field]
            return value if isinstance(value, str) else str(value)

        if input_data:
            if field == "reason":
                return input_data.get("reason", "")
            if field == "user_prompt":
                return input_data.get("user_prompt", "")
            if field == "transcript":
                inline_transcript = input_data.get("transcript")
                if inline_transcript is not None:
                    return inline_transcript
                transcript_path = input_data.get("transcript_path")
                if transcript_path:
                    try:
                        with open(transcript_path, "r", encoding="utf-8") as handle:
                            return handle.read()
                    except FileNotFoundError:
                        print(f"Warning: Transcript file not found: {transcript_path}", file=sys.stderr)
                        return ""
                    except (IOError, OSError, PermissionError, UnicodeDecodeError) as exc:
                        print(f"Warning: Unable to read transcript {transcript_path}: {exc}", file=sys.stderr)
                        return ""

        if tool_name == "Bash" and field == "command":
            return tool_input.get("command", "")

        if tool_name in ("Write", "Edit"):
            if field == "content":
                return tool_input.get("content") or tool_input.get("new_string", "")
            if field in ("new_text", "new_string"):
                return tool_input.get("new_string") or tool_input.get("content", "")
            if field in ("old_text", "old_string"):
                return tool_input.get("old_string", "")
            if field == "file_path":
                return tool_input.get("file_path", "")

        if tool_name == "MultiEdit":
            if field == "file_path":
                return tool_input.get("file_path", "")
            if field in ("new_text", "content"):
                edits = tool_input.get("edits", [])
                return " ".join(edit.get("new_string", "") for edit in edits)
            if field in ("old_text", "old_string"):
                edits = tool_input.get("edits", [])
                return " ".join(edit.get("old_string", "") for edit in edits)

        return None

    @staticmethod
    def _regex_match(pattern: str, text: str) -> bool:
        try:
            return bool(compile_regex(pattern).search(text))
        except re.error as exc:
            print(f"Invalid regex pattern '{pattern}': {exc}", file=sys.stderr)
            return False

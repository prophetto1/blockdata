#!/usr/bin/env python3
"""Configuration loader for the Codex hookify compatibility layer."""

from __future__ import annotations

import glob
import os
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


DEFAULT_RULE_DIRS = [".codex", ".claude"]


@dataclass
class Condition:
    """A single condition for matching."""

    field: str
    operator: str
    pattern: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Condition":
        return cls(
            field=data.get("field", ""),
            operator=data.get("operator", "regex_match"),
            pattern=data.get("pattern", ""),
        )


@dataclass
class Rule:
    """A hookify rule."""

    name: str
    enabled: bool
    event: str
    pattern: Optional[str] = None
    conditions: List[Condition] = field(default_factory=list)
    action: str = "warn"
    tool_matcher: Optional[str] = None
    message: str = ""
    source_path: Optional[str] = None

    @classmethod
    def from_dict(cls, frontmatter: Dict[str, Any], message: str) -> "Rule":
        conditions: List[Condition] = []
        if "conditions" in frontmatter and isinstance(frontmatter["conditions"], list):
            conditions = [Condition.from_dict(item) for item in frontmatter["conditions"]]

        simple_pattern = frontmatter.get("pattern")
        if simple_pattern and not conditions:
            event = frontmatter.get("event", "all")
            if event == "bash":
                field_name = "command"
            elif event == "file":
                field_name = "new_text"
            elif event == "prompt":
                field_name = "user_prompt"
            else:
                field_name = "content"

            conditions = [
                Condition(
                    field=field_name,
                    operator="regex_match",
                    pattern=simple_pattern,
                )
            ]

        return cls(
            name=frontmatter.get("name", "unnamed"),
            enabled=frontmatter.get("enabled", True),
            event=frontmatter.get("event", "all"),
            pattern=simple_pattern,
            conditions=conditions,
            action=frontmatter.get("action", "warn"),
            tool_matcher=frontmatter.get("tool_matcher"),
            message=message.strip(),
        )


def extract_frontmatter(content: str) -> tuple[Dict[str, Any], str]:
    """Extract YAML frontmatter and message body from markdown."""

    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    frontmatter_text = parts[1]
    message = parts[2].strip()

    frontmatter: Dict[str, Any] = {}
    lines = frontmatter_text.split("\n")

    current_key = None
    current_list: List[Any] = []
    current_dict: Dict[str, Any] = {}
    in_list = False
    in_dict_item = False

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())

        if indent == 0 and ":" in line and not stripped.startswith("-"):
            if in_list and current_key:
                if in_dict_item and current_dict:
                    current_list.append(current_dict)
                    current_dict = {}
                frontmatter[current_key] = current_list
                in_list = False
                in_dict_item = False
                current_list = []

            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            if not value:
                current_key = key
                in_list = True
                current_list = []
            else:
                value = value.strip('"').strip("'")
                if value.lower() == "true":
                    parsed: Any = True
                elif value.lower() == "false":
                    parsed = False
                else:
                    parsed = value
                frontmatter[key] = parsed

        elif stripped.startswith("-") and in_list:
            if in_dict_item and current_dict:
                current_list.append(current_dict)
                current_dict = {}

            item_text = stripped[1:].strip()
            if ":" in item_text and "," in item_text:
                item_dict: Dict[str, str] = {}
                for part in item_text.split(","):
                    if ":" not in part:
                        continue
                    key, value = part.split(":", 1)
                    item_dict[key.strip()] = value.strip().strip('"').strip("'")
                current_list.append(item_dict)
                in_dict_item = False
            elif ":" in item_text:
                in_dict_item = True
                key, value = item_text.split(":", 1)
                current_dict = {key.strip(): value.strip().strip('"').strip("'")}
            else:
                current_list.append(item_text.strip('"').strip("'"))
                in_dict_item = False

        elif indent > 2 and in_dict_item and ":" in line:
            key, value = stripped.split(":", 1)
            current_dict[key.strip()] = value.strip().strip('"').strip("'")

    if in_list and current_key:
        if in_dict_item and current_dict:
            current_list.append(current_dict)
        frontmatter[current_key] = current_list

    return frontmatter, message


def resolve_rule_dirs(rule_dirs: Optional[List[str]] = None) -> List[str]:
    """Resolve rule directories from args, env, or defaults."""

    if rule_dirs:
        return rule_dirs

    env_value = os.environ.get("HOOKIFY_RULE_DIRS")
    if env_value:
        return [item for item in env_value.split(os.pathsep) if item]

    return DEFAULT_RULE_DIRS.copy()


def discover_rule_files(rule_dirs: Optional[List[str]] = None) -> List[str]:
    """Discover rule files across rule directories."""

    files: List[str] = []
    for rule_dir in resolve_rule_dirs(rule_dirs):
        pattern = os.path.join(rule_dir, "hookify.*.local.md")
        files.extend(sorted(glob.glob(pattern)))
    return files


def load_rules(event: Optional[str] = None, rule_dirs: Optional[List[str]] = None) -> List[Rule]:
    """Load all enabled rules matching the requested event."""

    rules: List[Rule] = []
    seen_names = set()

    for file_path in discover_rule_files(rule_dirs):
        try:
            rule = load_rule_file(file_path)
        except Exception as exc:  # pragma: no cover - kept defensive for CLI safety
            print(f"Warning: Unexpected error loading {file_path} ({type(exc).__name__}): {exc}", file=sys.stderr)
            continue

        if not rule or not rule.enabled:
            continue
        if event and rule.event not in ("all", event):
            continue
        if rule.name in seen_names:
            continue

        seen_names.add(rule.name)
        rules.append(rule)

    return rules


def load_rule_file(file_path: str) -> Optional[Rule]:
    """Load a single rule file."""

    try:
        with open(file_path, "r", encoding="utf-8") as handle:
            content = handle.read()
    except (IOError, OSError, PermissionError) as exc:
        print(f"Error: Cannot read {file_path}: {exc}", file=sys.stderr)
        return None
    except UnicodeDecodeError as exc:
        print(f"Error: Invalid encoding in {file_path}: {exc}", file=sys.stderr)
        return None

    frontmatter, message = extract_frontmatter(content)
    if not frontmatter:
        print(f"Warning: {file_path} is missing YAML frontmatter", file=sys.stderr)
        return None

    rule = Rule.from_dict(frontmatter, message)
    rule.source_path = file_path
    return rule

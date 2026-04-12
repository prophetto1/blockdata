#!/usr/bin/env python3
"""CLI bridge that evaluates hookify-style rules in Codex-compatible workflows."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(errors="backslashreplace")


SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

from core.config_loader import load_rules  # noqa: E402
from core.rule_engine import RuleEngine  # noqa: E402


EXIT_ALLOW_OR_WARN = 0
EXIT_ERROR = 1
EXIT_BLOCK = 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate hookify rules from Codex-compatible workflows.")
    parser.add_argument(
        "--rule-dir",
        action="append",
        dest="rule_dirs",
        help="Rule directory to search. Repeat for multiple directories.",
    )

    subparsers = parser.add_subparsers(dest="command_name", required=True)

    list_parser = subparsers.add_parser("list-rules", help="List discovered rules.")
    list_parser.add_argument("--event", choices=["bash", "file", "stop", "prompt", "all"])

    command_parser = subparsers.add_parser("check-command", help="Check a shell command against bash rules.")
    command_parser.add_argument("--command", required=True)
    command_parser.add_argument("--json", action="store_true")

    file_parser = subparsers.add_parser("check-file", help="Check a file edit against file rules.")
    file_parser.add_argument("--file-path", required=True)
    file_parser.add_argument("--new-text")
    file_parser.add_argument("--new-text-file")
    file_parser.add_argument("--old-text")
    file_parser.add_argument("--old-text-file")
    file_parser.add_argument("--tool-name", default="Write", choices=["Write", "Edit", "MultiEdit"])
    file_parser.add_argument("--json", action="store_true")

    stop_parser = subparsers.add_parser("check-stop", help="Check stop conditions against transcript-aware rules.")
    stop_parser.add_argument("--reason", default="")
    stop_parser.add_argument("--transcript")
    stop_parser.add_argument("--transcript-file")
    stop_parser.add_argument("--json", action="store_true")

    prompt_parser = subparsers.add_parser("check-prompt", help="Check a user prompt against prompt rules.")
    prompt_parser.add_argument("--prompt", required=True)
    prompt_parser.add_argument("--json", action="store_true")

    payload_parser = subparsers.add_parser("check-json", help="Check a normalized hook payload from JSON.")
    payload_parser.add_argument("--input-file", required=True)
    payload_parser.add_argument("--event", choices=["bash", "file", "stop", "prompt", "all"])
    payload_parser.add_argument("--json", action="store_true")

    return parser.parse_args()


def read_text_arg(inline_value: Optional[str], file_path: Optional[str]) -> str:
    if inline_value is not None:
        return inline_value
    if file_path:
        return Path(file_path).read_text(encoding="utf-8")
    return ""


def build_payload(args: argparse.Namespace) -> tuple[str, Dict[str, Any]]:
    if args.command_name == "check-command":
        return "bash", {
            "hook_event_name": "PreToolUse",
            "tool_name": "Bash",
            "tool_input": {"command": args.command},
        }

    if args.command_name == "check-file":
        new_text = read_text_arg(args.new_text, args.new_text_file)
        old_text = read_text_arg(args.old_text, args.old_text_file)

        if args.tool_name == "MultiEdit":
            payload = {
                "hook_event_name": "PreToolUse",
                "tool_name": "MultiEdit",
                "tool_input": {
                    "file_path": args.file_path,
                    "edits": [
                        {
                            "old_string": old_text,
                            "new_string": new_text,
                        }
                    ],
                },
            }
        else:
            tool_input: Dict[str, Any] = {"file_path": args.file_path}
            if args.tool_name == "Write":
                tool_input["content"] = new_text
            else:
                tool_input["new_string"] = new_text
                tool_input["old_string"] = old_text

            payload = {
                "hook_event_name": "PreToolUse",
                "tool_name": args.tool_name,
                "tool_input": tool_input,
            }

        return "file", payload

    if args.command_name == "check-stop":
        transcript = read_text_arg(args.transcript, args.transcript_file)
        return "stop", {
            "hook_event_name": "Stop",
            "reason": args.reason,
            "transcript": transcript,
            "tool_name": "",
            "tool_input": {},
        }

    if args.command_name == "check-prompt":
        return "prompt", {
            "hook_event_name": "UserPromptSubmit",
            "user_prompt": args.prompt,
            "tool_name": "",
            "tool_input": {},
        }

    if args.command_name == "check-json":
        payload = json.loads(Path(args.input_file).read_text(encoding="utf-8"))
        inferred_event = args.event or infer_event_from_payload(payload)
        return inferred_event, payload

    raise ValueError(f"Unsupported command: {args.command_name}")


def infer_event_from_payload(payload: Dict[str, Any]) -> str:
    if "user_prompt" in payload:
        return "prompt"
    hook_event_name = payload.get("hook_event_name")
    if hook_event_name == "Stop":
        return "stop"
    tool_name = payload.get("tool_name")
    if tool_name == "Bash":
        return "bash"
    if tool_name in ("Write", "Edit", "MultiEdit"):
        return "file"
    return "all"


def list_rules(rule_dirs: Optional[List[str]], event: Optional[str]) -> int:
    rules = load_rules(None if event == "all" else event, rule_dirs=rule_dirs)
    if not rules:
        print("No rules found.")
        return EXIT_ALLOW_OR_WARN

    for rule in rules:
        source = rule.source_path or "<unknown>"
        print(f"{rule.name}\t{rule.event}\t{rule.action}\t{source}")
    return EXIT_ALLOW_OR_WARN


def is_blocked(result: Dict[str, Any]) -> bool:
    hook_output = result.get("hookSpecificOutput", {})
    return result.get("decision") == "block" or hook_output.get("permissionDecision") == "deny"


def print_human_result(result: Dict[str, Any]) -> None:
    if not result:
        print("ALLOW: no rules matched.")
        return

    message = result.get("systemMessage", "").strip()
    prefix = "BLOCK" if is_blocked(result) else "WARN"

    if message:
        print(f"{prefix}: {message}")
    else:
        print(f"{prefix}: rule matched.")


def run_check(args: argparse.Namespace) -> int:
    event, payload = build_payload(args)
    rules = load_rules(None if event == "all" else event, rule_dirs=args.rule_dirs)
    result = RuleEngine().evaluate_rules(rules, payload)

    if getattr(args, "json", False):
        print(json.dumps(result, indent=2))
    else:
        print_human_result(result)

    return EXIT_BLOCK if is_blocked(result) else EXIT_ALLOW_OR_WARN


def main() -> int:
    try:
        args = parse_args()
        if args.command_name == "list-rules":
            return list_rules(args.rule_dirs, args.event)
        return run_check(args)
    except Exception as exc:  # pragma: no cover - CLI safety path
        print(f"ERROR: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())

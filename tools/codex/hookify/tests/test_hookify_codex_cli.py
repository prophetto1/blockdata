from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "package.json").exists() and (candidate / "tools").exists():
            return candidate
    raise RuntimeError(f"Could not locate repo root from {start}")


REPO_ROOT = find_repo_root(Path(__file__))
SCRIPT_PATH = REPO_ROOT / "tools" / "codex" / "hookify" / "scripts" / "hookify_codex.py"
CLAUDE_HOOKIFY_ROOT = REPO_ROOT / "_collaborate" / "tools" / "plugins" / "claude" / "hookify-mkt" / "plugins" / "hookify"


class HookifyCodexCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="hookify-codex-test-"))
        (self.temp_dir / ".claude").mkdir()

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir)

    def _copy_example(self, name: str) -> None:
        source = CLAUDE_HOOKIFY_ROOT / "examples" / name
        suffix = name.removesuffix(".local.md")
        target = self.temp_dir / ".claude" / f"hookify.{suffix}.local.md"
        target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")

    def _run(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT_PATH), *args],
            cwd=self.temp_dir,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_blocks_dangerous_rm_example_rule(self) -> None:
        self._copy_example("dangerous-rm.local.md")
        result = self._run("check-command", "--command", "rm -rf /tmp/test")

        self.assertEqual(result.returncode, 2)
        self.assertIn("Dangerous rm command detected", result.stdout)

    def test_warns_console_log_example_rule(self) -> None:
        self._copy_example("console-log-warning.local.md")
        result = self._run(
            "check-file",
            "--file-path",
            "src/example.ts",
            "--new-text",
            "console.log('debug')",
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("Console.log detected", result.stdout)

    def test_codex_rules_override_claude_rules_by_name(self) -> None:
        (self.temp_dir / ".codex").mkdir()
        shared_rule = """---
name: shared-rule
enabled: true
event: bash
pattern: rm\\s+-rf
action: warn
---

Shared warning.
"""
        codex_rule = """---
name: shared-rule
enabled: true
event: bash
pattern: rm\\s+-rf
action: block
---

Codex override.
"""
        (self.temp_dir / ".claude" / "hookify.shared.local.md").write_text(shared_rule, encoding="utf-8")
        (self.temp_dir / ".codex" / "hookify.shared.local.md").write_text(codex_rule, encoding="utf-8")

        result = self._run("check-command", "--command", "rm -rf /tmp/test")

        self.assertEqual(result.returncode, 2)
        self.assertIn("Codex override.", result.stdout)
        self.assertNotIn("Shared warning.", result.stdout)

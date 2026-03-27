#!/usr/bin/env python3
"""Validate Legal-10 static site HTML contract.

Checks every `website/<dir>/**/*.html` page for:
- Tailwind CDN: https://cdn.tailwindcss.com
- Exactly one <main id="l10-page"> … </main>
- Site shell script include:
  - Root pages: shared/site-shell.js (or /shared/site-shell.js)
  - Nested pages: ../shared/site-shell.js (or /shared/site-shell.js)
- No page-defined theme toggle: id="theme-toggle"

Usage:
  py validate_site_html.py                       # validates website/public/
  py validate_site_html.py public-experimental   # validates website/public-experimental/
  py validate_site_html.py ../website-draft/public  # validates an explicit path
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


WEBSITE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR: Path = WEBSITE_DIR / "public"  # Default, can be overridden via CLI

TAILWIND_CDN = "https://cdn.tailwindcss.com"

# Allow /shared/site-shell.js everywhere (absolute-from-root).
SHELL_ABSOLUTE = "/shared/site-shell.js"

SHELL_ROOT_REL = "shared/site-shell.js"


MAIN_RE = re.compile(r"<main\b[^>]*\bid=(\"|')l10-page\1", re.IGNORECASE)
THEME_TOGGLE_RE = re.compile(r"\bid=(\"|')theme-toggle\1", re.IGNORECASE)

# Conservative script src extraction (good enough for static pages).
SCRIPT_SRC_RE = re.compile(
    r"<script\b[^>]*\bsrc=(\"|')(?P<src>[^\"']+)\1[^>]*>\s*</script>",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Issue:
    path: Path
    message: str


def _is_nested_page(path: Path) -> bool:
    # `public/index.html` depth = 0; `public/reports/x.html` depth >= 1
    return path.parent != PUBLIC_DIR


def _expected_shell_rel(path: Path) -> str:
    """Compute relative script path from page folder to `public/shared/site-shell.js`."""
    rel_parent = path.parent.relative_to(PUBLIC_DIR)
    depth = 0 if str(rel_parent) == "." else len(rel_parent.parts)
    return ("../" * depth) + SHELL_ROOT_REL


def _script_srcs(html: str) -> set[str]:
    return {m.group("src") for m in SCRIPT_SRC_RE.finditer(html)}


def validate_page(path: Path) -> list[Issue]:
    issues: list[Issue] = []
    try:
        html = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return [Issue(path=path, message=f"Could not read file: {e}")]

    # Tailwind
    if TAILWIND_CDN not in html:
        issues.append(Issue(path=path, message=f"Missing required Tailwind script: {TAILWIND_CDN}"))

    # Exactly one <main id="l10-page">
    main_count = len(MAIN_RE.findall(html))
    if main_count != 1:
        issues.append(Issue(path=path, message=f'Expected exactly one <main id="l10-page">, found {main_count}'))

    # No theme toggle in-page
    if THEME_TOGGLE_RE.search(html):
        issues.append(Issue(path=path, message='Page must not define id="theme-toggle" (owned by shell)'))

    # Site shell script include
    srcs = _script_srcs(html)
    expected = {SHELL_ABSOLUTE, _expected_shell_rel(path)}
    if not (srcs & expected):
        # Provide a concrete required tag in error output (for copy/paste).
        required_src = _expected_shell_rel(path)
        issues.append(
            Issue(
                path=path,
                message=(
                    "Missing required script tag: "
                    f'<script src="{required_src}"></script> (or {SHELL_ABSOLUTE})'
                ),
            )
        )

    return issues


def main() -> int:
    global PUBLIC_DIR

    parser = argparse.ArgumentParser(description="Validate Legal-10 static site HTML contract.")
    parser.add_argument(
        "directory",
        nargs="?",
        default="public",
        help="Directory under website/ OR an explicit path to a public/ folder (default: public)",
    )
    args = parser.parse_args()

    directory_arg: str = args.directory
    looks_like_path = any(sep in directory_arg for sep in ("/", "\\", ":")) or directory_arg.startswith(".")
    if looks_like_path:
        public_dir = Path(directory_arg).expanduser()
        PUBLIC_DIR = public_dir if public_dir.is_absolute() else (Path.cwd() / public_dir).resolve()
    else:
        PUBLIC_DIR = WEBSITE_DIR / directory_arg

    if not PUBLIC_DIR.exists():
        if looks_like_path:
            print(f"ERROR: directory not found at {PUBLIC_DIR}")
        else:
            print(f"ERROR: website/{directory_arg}/ directory not found at {PUBLIC_DIR}")
        return 2

    pages = sorted(PUBLIC_DIR.rglob("*.html"))
    # Skip _archive directory (old/deprecated pages), admin/ (non-public pages),
    # and pitch-deck/ (standalone exported Next.js app that intentionally doesn't use site-shell).
    pages = [
        p
        for p in pages
        if "_archive" not in p.parts and "admin" not in p.parts and "pitch-deck" not in p.parts
    ]
    all_issues: list[Issue] = []

    for page in pages:
        all_issues.extend(validate_page(page))

    for issue in all_issues:
        rel = issue.path.relative_to(PUBLIC_DIR.parent)
        print(f"ERROR: {rel}: {issue.message}")

    if all_issues:
        print(f"\nFound {len(all_issues)} issue(s) across {len(pages)} page(s).")
        return 1

    display_dir = str(PUBLIC_DIR) if looks_like_path else f"website/{directory_arg}/"
    print(f"OK: validated {len(pages)} page(s) in {display_dir}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

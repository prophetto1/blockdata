#!/usr/bin/env python3
"""
Generate sitemap.xml from all HTML files in website/public/.

Usage:
    python website/scripts/generate_sitemap.py

Output:
    website/public/sitemap.xml
"""

from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Configuration
SITE_URL = "https://www.legalchain.run"
WEBSITE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = WEBSITE_DIR / "public"
OUTPUT_FILE = PUBLIC_DIR / "sitemap.xml"

# Directories/files to exclude from sitemap
EXCLUDE_PATTERNS = [
    "_archive",
    "_legacy",
    "admin",  # CMS admin page
]

EXCLUDE_ROOT_FILES = {
    'contact.html',
    'developers.html',
    'our-methods.html',
    'report-style.html',
    'reports.html',
}

# Priority mapping by path depth and section
PRIORITY_MAP = {
    "/": 1.0,
    "/index.html": 1.0,
    "/leaderboard/": 0.9,
    "/methods/": 0.9,
    "/benchmarks/": 0.8,
    "/about/": 0.7,
    "/reports/": 0.7,
}

DEFAULT_PRIORITY = 0.5


def get_priority(url_path: str) -> float:
    """Determine priority based on URL path."""
    # Check exact matches first
    if url_path in PRIORITY_MAP:
        return PRIORITY_MAP[url_path]

    # Check section prefixes
    for prefix, priority in PRIORITY_MAP.items():
        if url_path.startswith(prefix) and prefix != "/":
            # Sub-pages get slightly lower priority than section index
            return max(0.4, priority - 0.1)

    return DEFAULT_PRIORITY


def get_changefreq(url_path: str) -> str:
    """Determine change frequency based on URL path."""
    if url_path in ["/", "/index.html", "/leaderboard/"]:
        return "weekly"
    if "/methods/" in url_path or "/benchmarks/" in url_path:
        return "monthly"
    return "monthly"


def should_exclude(path: Path) -> bool:
    """Check if path should be excluded from sitemap."""
    rel = path.relative_to(PUBLIC_DIR)
    if len(rel.parts) == 1 and rel.name in EXCLUDE_ROOT_FILES:
        return True
    # Keep only the canonical deck URL; exclude Next export helper/error pages.
    if "pitch-deck" in rel.parts:
        if rel.name == "404.html" or "_not-found" in rel.parts or "404" in rel.parts:
            return True
    for pattern in EXCLUDE_PATTERNS:
        if pattern in path.parts:
            return True
    return False


def html_to_url(html_path: Path) -> str:
    """Convert HTML file path to URL."""
    rel_path = html_path.relative_to(PUBLIC_DIR)
    url_path = "/" + str(rel_path).replace("\\", "/")

    # Convert index.html to directory URL
    if url_path.endswith("/index.html"):
        url_path = url_path[:-10]  # Remove "index.html"
        if not url_path:
            url_path = "/"

    return url_path


def get_lastmod(html_path: Path) -> str:
    """Get last modification date in W3C format."""
    mtime = html_path.stat().st_mtime
    return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")


def generate_sitemap() -> str:
    """Generate sitemap XML content."""
    # Find all HTML files
    html_files = sorted(PUBLIC_DIR.rglob("*.html"))

    # Filter out excluded paths
    html_files = [f for f in html_files if not should_exclude(f)]

    # Build URL entries
    urls = []
    for html_path in html_files:
        url_path = html_to_url(html_path)
        urls.append({
            "loc": f"{SITE_URL}{url_path}",
            "lastmod": get_lastmod(html_path),
            "changefreq": get_changefreq(url_path),
            "priority": get_priority(url_path),
        })

    # Sort by priority (descending) then by URL
    urls.sort(key=lambda u: (-u["priority"], u["loc"]))

    # Build XML
    urlset = ET.Element("urlset")
    urlset.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")

    for url_data in urls:
        url_elem = ET.SubElement(urlset, "url")

        loc = ET.SubElement(url_elem, "loc")
        loc.text = url_data["loc"]

        lastmod = ET.SubElement(url_elem, "lastmod")
        lastmod.text = url_data["lastmod"]

        changefreq = ET.SubElement(url_elem, "changefreq")
        changefreq.text = url_data["changefreq"]

        priority = ET.SubElement(url_elem, "priority")
        priority.text = f"{url_data['priority']:.1f}"

    # Pretty print
    xml_str = ET.tostring(urlset, encoding="unicode")
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent="  ", encoding=None)

    # Remove extra blank lines and fix declaration
    lines = pretty_xml.split("\n")
    lines = [line for line in lines if line.strip()]
    lines[0] = '<?xml version="1.0" encoding="UTF-8"?>'

    return "\n".join(lines)


def main():
    print(f"Scanning {PUBLIC_DIR} for HTML files...")

    sitemap_content = generate_sitemap()

    # Count URLs
    url_count = sitemap_content.count("<url>")

    # Write sitemap
    OUTPUT_FILE.write_text(sitemap_content, encoding="utf-8")
    print(f"Generated {OUTPUT_FILE} with {url_count} URLs")

    # Print summary by section
    print("\nURLs by section:")
    sections = {}
    for line in sitemap_content.split("\n"):
        if "<loc>" in line:
            url = line.strip().replace("<loc>", "").replace("</loc>", "")
            path = url.replace(SITE_URL, "")
            section = path.split("/")[1] if "/" in path[1:] else "root"
            sections[section] = sections.get(section, 0) + 1

    for section, count in sorted(sections.items(), key=lambda x: -x[1]):
        print(f"  {section}: {count}")


if __name__ == "__main__":
    main()

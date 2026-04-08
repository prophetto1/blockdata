"""
Bulk-extract full plugin detail from local Kestra API.
Saves to scripts/kestra-plugin-details.json for DB hydration.

Usage: python3 scripts/extract-kestra-plugins.py
"""

import json
import sys
import time
import urllib.request
import urllib.error

KESTRA_BASE = "http://localhost:8080"
PLUGINS_URL = f"{KESTRA_BASE}/api/v1/plugins"
OUTPUT_FILE = "scripts/kestra-plugin-details.json"

def fetch_json(url: str):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def main():
    print(f"Fetching plugin list from {PLUGINS_URL} ...")
    plugins = fetch_json(PLUGINS_URL)

    # Collect all classes with their list-level metadata
    all_items = []
    for plugin in plugins:
        plugin_meta = {
            "plugin_name": plugin.get("name", ""),
            "plugin_title": plugin.get("title", ""),
            "plugin_group": plugin.get("group", ""),
            "plugin_version": plugin.get("manifest", {}).get("X-Kestra-Version", ""),
            "categories": plugin.get("categories", []),
        }
        for section in ["tasks", "triggers", "conditions"]:
            for item in plugin.get(section, []):
                all_items.append({
                    **plugin_meta,
                    "task_class": item["cls"],
                    "task_title": item.get("title", ""),
                    "task_description": item.get("description", ""),
                    "component_type": section.rstrip("s"),  # task, trigger, condition
                    "deprecated": item.get("deprecated", False),
                })

    print(f"Found {len(all_items)} items. Fetching detail for each...")

    results = []
    errors = []
    for i, item in enumerate(all_items):
        cls = item["task_class"]
        detail_url = f"{KESTRA_BASE}/api/v1/plugins/{cls}"
        try:
            detail = fetch_json(detail_url)
            item["task_schema"] = detail.get("schema", {})
            item["task_markdown"] = detail.get("markdown", "")
            results.append(item)
            if (i + 1) % 50 == 0:
                print(f"  {i + 1}/{len(all_items)} done")
        except urllib.error.HTTPError as e:
            errors.append({"cls": cls, "status": e.code, "reason": str(e.reason)})
            item["task_schema"] = {}
            item["task_markdown"] = ""
            results.append(item)
        except Exception as e:
            errors.append({"cls": cls, "error": str(e)})
            item["task_schema"] = {}
            item["task_markdown"] = ""
            results.append(item)

    print(f"\nDone. {len(results)} extracted, {len(errors)} errors.")

    output = {
        "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(results),
        "errors": errors,
        "items": results,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Saved to {OUTPUT_FILE}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for err in errors:
            print(f"  {err}")

if __name__ == "__main__":
    main()

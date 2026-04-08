"""
Push extracted Kestra plugin data to integration_catalog_items_temp via Supabase REST API.
Batches inserts to avoid payload limits.

Usage: python3 scripts/push-to-temp-table.py
Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or reads from .env)
"""

import json
import os
import sys
import urllib.request
import urllib.error

def load_env():
    """Read .env file for Supabase credentials."""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    env = {}
    if os.path.exists(env_path):
        with open(env_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, val = line.partition('=')
                env[key.strip()] = val.strip().strip('"').strip("'")
    return env

def main():
    env = load_env()
    supabase_url = os.environ.get('SUPABASE_URL') or env.get('SUPABASE_URL') or 'https://dbdzzhshmigewyprahej.supabase.co'
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SERVICE_ROLE_KEY')

    if not service_key:
        print("ERROR: No SUPABASE_SERVICE_ROLE_KEY found in env or .env file")
        sys.exit(1)

    # Load extracted data
    with open('scripts/kestra-plugin-details.json', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    print(f"Loaded {len(items)} items from extraction file.")

    # Service type inference (same logic as edge function)
    def infer_service_type(task_class: str) -> str:
        tc = task_class.lower()
        if '.dbt.' in tc:
            return 'dbt'
        if '.docling.' in tc or 'document' in tc or 'parser' in tc:
            return 'docling'
        if '.jdbc.' in tc or '.sql.' in tc or '.dlt.' in tc or 'sqlite' in tc:
            return 'dlt'
        if 'convert' in tc:
            return 'conversion'
        if '.edge.' in tc or 'supabase' in tc:
            return 'edge'
        return 'custom'

    # Build rows for REST API insert
    def build_row(item):
        return {
            "source": "kestra",
            "external_id": item["task_class"],
            "plugin_name": item.get("plugin_name", ""),
            "plugin_title": item.get("plugin_title") or None,
            "plugin_group": item.get("plugin_group") or None,
            "plugin_version": item.get("plugin_version") or None,
            "categories": item.get("categories", []),
            "task_class": item["task_class"],
            "task_title": item.get("task_title") or None,
            "task_description": item.get("task_description") or None,
            "task_schema": item.get("task_schema", {}),
            "task_markdown": item.get("task_markdown") or None,
            "enabled": True,
            "suggested_service_type": infer_service_type(item["task_class"]),
        }

    rows = [build_row(item) for item in items]

    # Batch insert via Supabase REST API (PostgREST)
    table_url = f"{supabase_url}/rest/v1/integration_catalog_items_temp"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # upsert on unique constraints
    }

    BATCH_SIZE = 25  # Keep payloads reasonable given markdown size
    total_inserted = 0
    total_errors = 0

    for batch_start in range(0, len(rows), BATCH_SIZE):
        batch = rows[batch_start:batch_start + BATCH_SIZE]
        payload = json.dumps(batch, ensure_ascii=False).encode('utf-8')

        req = urllib.request.Request(table_url, data=payload, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                total_inserted += len(batch)
                if (batch_start + BATCH_SIZE) % 100 < BATCH_SIZE:
                    print(f"  {min(batch_start + BATCH_SIZE, len(rows))}/{len(rows)} inserted")
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            print(f"  ERROR at batch {batch_start}: HTTP {e.code} - {body[:500]}")
            total_errors += len(batch)
        except Exception as e:
            print(f"  ERROR at batch {batch_start}: {e}")
            total_errors += len(batch)

    print(f"\nDone. Inserted: {total_inserted}, Errors: {total_errors}")

if __name__ == "__main__":
    main()

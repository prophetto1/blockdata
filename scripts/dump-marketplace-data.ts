/**
 * dump-marketplace-data.ts
 *
 * Dumps integration catalog + service registry data from Supabase
 * to static JSON files for the docs site marketplace pages.
 *
 * Usage:  npx tsx scripts/dump-marketplace-data.ts
 * Env:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (reads from ../.env)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Load env from root .env                                            */
/* ------------------------------------------------------------------ */

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const envPath = resolve(ROOT, '.env');

function loadEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const text = readFileSync(path, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  } catch {
    // ignore missing .env
  }
  return vars;
}

const env = { ...loadEnv(envPath), ...process.env };
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const OUT_DIR = resolve(ROOT, 'web/src/data');

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IntegrationProvider = {
  plugin_group: string;
  provider_name: string;
  provider_docs_url: string | null;
  auth_type: string | null;
  is_internal: boolean;
  tasks: {
    item_id: string;
    task_class: string;
    task_title: string | null;
    task_description: string | null;
    categories: string[];
    plugin_name: string;
    plugin_title: string | null;
  }[];
};

type MarketplaceService = {
  service_id: string;
  service_type: string;
  service_type_label: string;
  service_name: string;
  description: string | null;
  docs_url: string | null;
  health_status: string;
  functions: {
    function_id: string;
    function_name: string;
    function_type: string;
    label: string;
    description: string | null;
    tags: string[];
    beta: boolean;
    deprecated: boolean;
  }[];
};

/* ------------------------------------------------------------------ */
/*  Dump integrations                                                  */
/* ------------------------------------------------------------------ */

async function dumpIntegrations() {
  // Table name: kestra_plugin_items (hosted) or integration_catalog_items (local)
  console.log('Fetching integration catalog items...');
  const { data: items, error: itemsErr } = await supabase
    .from('kestra_plugin_items')
    .select('item_id, plugin_name, plugin_title, plugin_group, categories, task_class, task_title, task_description')
    .eq('enabled', true)
    .order('plugin_group')
    .order('task_class');

  if (itemsErr) throw new Error(`kestra_plugin_items: ${itemsErr.message}`);

  console.log(`  ${items?.length ?? 0} items`);

  // kestra_provider_enrichment may not exist yet — gracefully skip
  console.log('Fetching provider enrichment...');
  const { data: providers, error: provErr } = await supabase
    .from('kestra_provider_enrichment')
    .select('plugin_group, provider_name, provider_docs_url, auth_type, is_internal');

  if (provErr) {
    console.log(`  kestra_provider_enrichment not available (${provErr.message}), using fallback names`);
  }

  console.log(`  ${providers?.length ?? 0} providers`);

  // Build a map of provider enrichment by plugin_group
  const providerMap = new Map<string, typeof providers[0]>();
  for (const p of providers ?? []) {
    providerMap.set(p.plugin_group, p);
  }

  // Group items by plugin_group
  const groupMap = new Map<string, IntegrationProvider>();
  for (const item of items ?? []) {
    const group = item.plugin_group ?? 'unknown';
    if (!groupMap.has(group)) {
      const prov = providerMap.get(group);
      groupMap.set(group, {
        plugin_group: group,
        provider_name: prov?.provider_name ?? group,
        provider_docs_url: prov?.provider_docs_url ?? null,
        auth_type: prov?.auth_type ?? null,
        is_internal: prov?.is_internal ?? false,
        tasks: [],
      });
    }
    const cats = item.categories;
    groupMap.get(group)!.tasks.push({
      item_id: item.item_id,
      task_class: item.task_class,
      task_title: item.task_title,
      task_description: item.task_description,
      categories: Array.isArray(cats) ? cats : [],
      plugin_name: item.plugin_name,
      plugin_title: item.plugin_title,
    });
  }

  const result = Array.from(groupMap.values()).sort((a, b) =>
    a.provider_name.localeCompare(b.provider_name),
  );

  const outPath = resolve(OUT_DIR, 'integrations.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${result.length} providers to ${outPath}`);
}

/* ------------------------------------------------------------------ */
/*  Dump services                                                      */
/* ------------------------------------------------------------------ */

async function dumpServices() {
  console.log('Fetching service type catalog...');
  const { data: types, error: typesErr } = await supabase
    .from('service_type_catalog')
    .select('service_type, label, description');

  if (typesErr) throw new Error(`service_type_catalog: ${typesErr.message}`);

  const typeMap = new Map<string, string>();
  for (const t of types ?? []) {
    typeMap.set(t.service_type, t.label);
  }

  // service_registry may not exist yet
  console.log('Fetching services...');
  const { data: services, error: svcErr } = await supabase
    .from('service_registry')
    .select('service_id, service_type, service_name, description, docs_url, health_status')
    .eq('enabled', true)
    .order('service_name');

  if (svcErr) {
    console.log(`  service_registry not available (${svcErr.message}), writing empty services`);
    const outPath = resolve(OUT_DIR, 'services.json');
    writeFileSync(outPath, JSON.stringify([], null, 2));
    console.log(`Wrote 0 services to ${outPath}`);
    return;
  }

  console.log(`  ${services?.length ?? 0} services`);

  // service_functions may not exist yet
  console.log('Fetching service functions...');
  const { data: fns, error: fnErr } = await supabase
    .from('service_functions')
    .select('function_id, service_id, function_name, function_type, label, description, tags, beta, deprecated')
    .eq('enabled', true)
    .order('function_name');

  if (fnErr) {
    console.log(`  service_functions not available (${fnErr.message}), continuing without functions`);
  }

  console.log(`  ${fns?.length ?? 0} functions`);

  // Group functions by service_id
  const fnMap = new Map<string, MarketplaceService['functions']>();
  for (const fn of (fns ?? []) as NonNullable<typeof fns>) {
    if (!fnMap.has(fn.service_id)) fnMap.set(fn.service_id, []);
    fnMap.get(fn.service_id)!.push({
      function_id: fn.function_id,
      function_name: fn.function_name,
      function_type: fn.function_type ?? 'unknown',
      label: fn.label ?? fn.function_name,
      description: fn.description,
      tags: Array.isArray(fn.tags) ? fn.tags : [],
      beta: fn.beta ?? false,
      deprecated: fn.deprecated ?? false,
    });
  }

  const result: MarketplaceService[] = (services ?? []).map((svc) => ({
    service_id: svc.service_id,
    service_type: svc.service_type,
    service_type_label: typeMap.get(svc.service_type) ?? svc.service_type,
    service_name: svc.service_name,
    description: svc.description,
    docs_url: svc.docs_url,
    health_status: svc.health_status ?? 'unknown',
    functions: fnMap.get(svc.service_id) ?? [],
  }));

  const outPath = resolve(OUT_DIR, 'services.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${result.length} services to ${outPath}`);
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  await dumpIntegrations();
  await dumpServices();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

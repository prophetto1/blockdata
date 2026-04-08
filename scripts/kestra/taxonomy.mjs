import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./web/src/data/kestra-catalog-full.json', 'utf-8'));

// External detection
const extPattern = /\b(aws|gcp|azure|google|microsoft|slack|kafka|amqp|mqtt|redis|elasticsearch|mongo|http|openai|anthropic|databricks|snowflake|bigquery|jdbc|ftp|sftp|ssh|smtp|neo4j|pinecone|weaviate|qdrant|arangodb|clickhouse|rockset|fivetran|airbyte|debezium|pulsar|nats|rabbitmq|solace|telegram|twilio|discord|github|gitlab|jira|zendesk|hubspot|salesforce|stripe|docker|kubernetes|dbt|singer|soda|powerbi|tableau|grafana|datadog|sentry|pagerduty|minio)/i;

function hasConnectionParams(item) {
  const props = item.task_schema?.properties?.properties || {};
  const propNames = Object.keys(props).join(' ').toLowerCase();
  return /url|host|endpoint|connection|credential|token|apikey|password|secret|bucket|region|database/.test(propNames);
}

// Build per-item classification
const byPlugin = {};  // plugin_title -> items
const byCat = {};     // categories[0] -> items
const byScope = { external: [], internal: [] };

for (const item of data) {
  // By plugin
  const pt = item.plugin_title || '(no plugin)';
  (byPlugin[pt] ||= []).push(item);

  // By category
  const cats = item.categories || ['(uncategorized)'];
  for (const c of cats) {
    (byCat[c] ||= []).push(item);
  }

  // By scope
  const isExt = extPattern.test(item.plugin_group || '') || hasConnectionParams(item);
  byScope[isExt ? 'external' : 'internal'].push(item);
}

console.log('=== BY PLUGIN TITLE ===');
const pluginSorted = Object.entries(byPlugin).sort((a, b) => b[1].length - a[1].length);
for (const [k, v] of pluginSorted) {
  console.log(`  ${k.padEnd(30)} ${v.length}`);
}
console.log(`  Total plugins: ${pluginSorted.length}\n`);

console.log('=== BY CATEGORY ===');
const catSorted = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);
for (const [k, v] of catSorted) {
  console.log(`  ${k.padEnd(30)} ${v.length}`);
}
console.log(`  Total categories: ${catSorted.length}\n`);

console.log('=== BY SCOPE ===');
console.log(`  External: ${byScope.external.length}`);
console.log(`  Internal: ${byScope.internal.length}`);

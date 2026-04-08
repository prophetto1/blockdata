import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./web/src/data/kestra-catalog-full.json', 'utf-8'));

const groups = {};

for (const item of data) {
  const g = item.plugin_group || '(none)';
  if (!groups[g]) groups[g] = { items: [], hasUrl: false };
  groups[g].items.push(item.task_class);

  const props = item.task_schema?.properties?.properties || {};
  const propNames = Object.keys(props).join(' ').toLowerCase();
  if (propNames.match(/url|host|endpoint|connection|credential|token|apikey|password|secret|bucket|region|database/)) {
    groups[g].hasUrl = true;
  }
}

const externalPatterns = /\b(aws|gcp|azure|google|microsoft|slack|kafka|amqp|mqtt|redis|elasticsearch|mongo|http|openai|anthropic|databricks|snowflake|bigquery|jdbc|ftp|sftp|ssh|smtp|neo4j|pinecone|weaviate|qdrant|arangodb|clickhouse|rockset|fivetran|airbyte|debezium|pulsar|nats|rabbitmq|solace|telegram|twilio|discord|github|gitlab|jira|zendesk|hubspot|salesforce|stripe|docker|kubernetes|dbt|singer|soda|powerbi|tableau|grafana|datadog|sentry|pagerduty|minio)/i;

const sorted = Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);

console.log('=== EXTERNAL (calls third-party services) ===');
console.log('Group'.padEnd(55) + 'Count  Connection params');
console.log('-'.repeat(85));
let extCount = 0;
for (const [g, info] of sorted) {
  if (externalPatterns.test(g) || info.hasUrl) {
    console.log(g.padEnd(55) + String(info.items.length).padStart(4) + '   ' + (info.hasUrl ? 'YES' : 'no'));
    extCount += info.items.length;
  }
}
console.log('Total external: ' + extCount);

console.log('\n=== INTERNAL (local/pure computation) ===');
console.log('Group'.padEnd(55) + 'Count  Connection params');
console.log('-'.repeat(85));
let intCount = 0;
for (const [g, info] of sorted) {
  if (!externalPatterns.test(g) && !info.hasUrl) {
    console.log(g.padEnd(55) + String(info.items.length).padStart(4) + '   no');
    intCount += info.items.length;
  }
}
console.log('Total internal: ' + intCount);

console.log('\n=== AMBIGUOUS (no external keyword but HAS connection params) ===');
let ambCount = 0;
for (const [g, info] of sorted) {
  if (!externalPatterns.test(g) && info.hasUrl) {
    console.log(g.padEnd(55) + String(info.items.length).padStart(4));
    ambCount += info.items.length;
  }
}
console.log('Total ambiguous: ' + ambCount);
console.log('\nGrand total: ' + data.length);

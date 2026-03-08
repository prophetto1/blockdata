import { describe, it, expect } from 'vitest';
import { parseFlowYaml, serializeFlowDocument, type FlowDocument } from './flow-document';

const MINIMAL_YAML = `id: hello-world
namespace: default
tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: Hello World
`;

const FULL_YAML = `id: my-flow
namespace: production
description: A test flow
labels:
  env: prod
  team: platform
inputs:
  - id: name
    type: STRING
    required: true
    defaults: World
tasks:
  - id: greet
    type: io.kestra.plugin.core.log.Log
    message: "Hello {{ inputs.name }}"
  - id: notify
    type: io.kestra.plugin.core.http.Request
    uri: "https://example.com/webhook"
triggers:
  - id: daily
    type: io.kestra.plugin.core.trigger.Schedule
    cron: "0 9 * * *"
`;

describe('parseFlowYaml', () => {
  it('parses minimal YAML', () => {
    const doc = parseFlowYaml(MINIMAL_YAML);
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe('hello-world');
    expect(doc!.namespace).toBe('default');
    expect(doc!.tasks).toHaveLength(1);
    expect(doc!.tasks[0].id).toBe('hello');
    expect(doc!.tasks[0].type).toBe('io.kestra.plugin.core.log.Log');
    expect(doc!.tasks[0].message).toBe('Hello World');
  });

  it('parses labels as Record<string, string>', () => {
    const doc = parseFlowYaml(FULL_YAML);
    expect(doc!.labels).toEqual([
      { key: 'env', value: 'prod' },
      { key: 'team', value: 'platform' },
    ]);
  });

  it('parses inputs', () => {
    const doc = parseFlowYaml(FULL_YAML);
    expect(doc!.inputs).toHaveLength(1);
    expect(doc!.inputs![0]).toMatchObject({
      id: 'name',
      type: 'STRING',
      required: true,
      defaults: 'World',
    });
  });

  it('parses triggers as known key (not _extra)', () => {
    const doc = parseFlowYaml(FULL_YAML);
    expect(doc!.triggers).toHaveLength(1);
    expect(doc!.triggers![0]).toHaveProperty('id', 'daily');
    expect(doc!._extra).not.toHaveProperty('triggers');
  });

  it('returns null for invalid YAML', () => {
    expect(parseFlowYaml('{{{')).toBeNull();
  });

  it('returns null for non-object YAML', () => {
    expect(parseFlowYaml('just a string')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseFlowYaml('')).toBeNull();
  });
});

describe('serializeFlowDocument', () => {
  it('produces valid YAML from a document', () => {
    const doc: FlowDocument = {
      id: 'test',
      namespace: 'default',
      tasks: [{ id: 'step1', type: 'io.kestra.plugin.core.log.Log', message: 'hi' }],
      _extra: {},
    };
    const output = serializeFlowDocument(doc);
    expect(output).toContain('id: test');
    expect(output).toContain('namespace: default');
    expect(output).toContain('- id: step1');
  });

  it('serializes labels as key-value map', () => {
    const doc: FlowDocument = {
      id: 'test',
      namespace: 'default',
      labels: [{ key: 'env', value: 'prod' }],
      tasks: [],
      _extra: {},
    };
    const output = serializeFlowDocument(doc);
    expect(output).toContain('labels:');
    expect(output).toContain('env: prod');
  });

  it('includes _extra keys in output', () => {
    const doc: FlowDocument = {
      id: 'test',
      namespace: 'default',
      tasks: [],
      _extra: { customField: { maxAttempt: 3 } },
    };
    const output = serializeFlowDocument(doc);
    expect(output).toContain('customField:');
    expect(output).toContain('maxAttempt: 3');
  });
});

describe('round-trip', () => {
  it('parse then serialize produces equivalent YAML', () => {
    const doc = parseFlowYaml(FULL_YAML);
    expect(doc).not.toBeNull();
    const serialized = serializeFlowDocument(doc!);
    const reparsed = parseFlowYaml(serialized);
    expect(reparsed).not.toBeNull();

    expect(reparsed!.id).toBe(doc!.id);
    expect(reparsed!.namespace).toBe(doc!.namespace);
    expect(reparsed!.description).toBe(doc!.description);
    expect(reparsed!.tasks).toHaveLength(doc!.tasks.length);
    expect(reparsed!.labels).toEqual(doc!.labels);
    expect(reparsed!.inputs).toEqual(doc!.inputs);
    expect(reparsed!.triggers).toHaveLength(1);
    expect(reparsed!.triggers![0]).toHaveProperty('id', 'daily');
  });

  it('preserves task-specific properties through round-trip', () => {
    const doc = parseFlowYaml(MINIMAL_YAML);
    const serialized = serializeFlowDocument(doc!);
    const reparsed = parseFlowYaml(serialized);
    expect(reparsed!.tasks[0].message).toBe('Hello World');
  });
});

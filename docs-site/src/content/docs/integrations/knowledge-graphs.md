---
title: Knowledge Graphs
description: Building knowledge graphs from schema overlays — Neo4j integration, graph-aware schema design, and multi-schema composition.
sidebar:
  order: 2
---

## Why blocks map to graphs

A knowledge graph has entities (nodes), relationships (edges), and properties on both. Per-block schema overlays naturally produce these elements when the schema is designed with graph structure in mind.

A citation extraction schema produces per block:
- **Source entity** — the case being read (node)
- **Target entity** — the case being cited (node)
- **Relationship type** — cites, distinguishes, overrules (edge)
- **Properties** — treatment signal, legal principle (edge properties)
- **Provenance** — `block_uid` traces every graph element back to a specific paragraph

## Neo4j as primary target

Neo4j's Labeled Property Graph model maps directly to overlay output:

| Overlay element | Neo4j element |
|----------------|---------------|
| Entity field value | Node (label from field name) |
| Relationship field value | Directed edge (typed) |
| Other fields | Properties on nodes/edges |
| `block_uid` | Provenance property on everything |

Neo4j is schema-optional — different schemas can create different node and edge types in the same instance without conflicts.

## Graph-aware schema design

Include a `graph_mapping` section in the schema to tell the export connector how to interpret fields:

```json
{
  "schema_ref": "citation_extraction_v1",
  "properties": {
    "source_case": { "type": "string" },
    "target_case": { "type": "string" },
    "relationship_type": { "type": "string", "enum": ["cites", "distinguishes", "overrules"] },
    "treatment_signal": { "type": "string" },
    "legal_principle": { "type": "string" }
  },
  "graph_mapping": {
    "source_case": { "role": "node", "label": "Case" },
    "target_case": { "role": "node", "label": "Case" },
    "relationship_type": { "role": "edge_type" },
    "treatment_signal": { "role": "edge_property" },
    "legal_principle": { "role": "edge_property" }
  }
}
```

Entity deduplication happens at the graph layer — `MERGE` on node identity ensures that the same case cited in 500 paragraphs produces one node with 500 edges, not 500 duplicates.

## Multi-schema graph composition

Multiple schemas targeting the same corpus contribute different layers to one graph:

| Schema | Produces |
|--------|----------|
| Citation extraction | `Case` nodes + `CITES`/`DISTINGUISHES`/`OVERRULES` edges |
| Entity extraction | `Person`, `Statute`, `Organization` nodes + `MENTIONS` edges |
| Topic tagging | Topic labels added to existing `Case` nodes |
| Holding extraction | `Principle` nodes + `ESTABLISHES` edges |

All schemas run independently over the same immutable blocks. All feed the same Neo4j instance. The resulting graph is richer than any single schema could produce.

## Alternative graph targets

| Target | Model | Notes |
|--------|-------|-------|
| **Amazon Neptune** | LPG (openCypher/Gremlin) or RDF (SPARQL) | Same JSONL, either model |
| **ArangoDB** | Multi-model (graph + document + key-value) | Document collections for nodes, edge collections for edges |
| **NetworkX / igraph** | In-memory (Python) | For analytics without a persistent graph DB |

The platform produces structured, provenance-rich JSONL. Graph databases consume it. The integration is downstream and format-agnostic at the export layer.

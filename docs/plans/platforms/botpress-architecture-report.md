# Botpress Architecture Report

> Analysis of the open-source Botpress monorepo component relationships and interoperation mechanics.
>
> Date: 2026-03-19

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Component Types](#component-types)
3. [The Core Relationship Model](#the-core-relationship-model)
4. [Packages — Foundation Layer](#packages--foundation-layer)
5. [Interfaces — Capability Contracts](#interfaces--capability-contracts)
6. [Integrations — External Connectors](#integrations--external-connectors)
7. [Plugins — Bot Middleware](#plugins--bot-middleware)
8. [Bots — The Composition Layer](#bots--the-composition-layer)
9. [Scripts — Operational Utilities](#scripts--operational-utilities)
10. [Package Dependency Tiers](#package-dependency-tiers)
11. [End-to-End Message Flow](#end-to-end-message-flow)
12. [Exceptions and Notable Patterns](#exceptions-and-notable-patterns)
13. [Appendix: Complete Inventory](#appendix-complete-inventory)

---

## Executive Summary

Botpress is a pnpm monorepo (Turbo-orchestrated, Node >=18) organized around six component types: **packages**, **interfaces**, **integrations**, **plugins**, **bots**, and **scripts**. The architecture follows a dependency-inversion pattern where interfaces define capability contracts, integrations implement them, plugins consume them abstractly, and bots wire the concrete bindings at composition time. All type contracts are enforced at build time via Zod schemas (`@bpinternal/zui`) and generated TypeScript.

The repository contains 12 packages, 13 interfaces, 68 integrations, 8 plugins, 13 example bots, and 3 operational scripts.

---

## Component Types

| Component | Count | What It Is | Defined By |
|-----------|-------|------------|------------|
| **Packages** | 12 | Core libraries (SDK, Client, CLI, LLM tools) | `package.json` |
| **Interfaces** | 13 | Capability contracts — schemas and action signatures with no implementation | `interface.definition.ts` |
| **Integrations** | 68 | External service connectors that **implement** interfaces | `integration.definition.ts` + `src/index.ts` |
| **Plugins** | 8 | Bot middleware that **consumes** interfaces via lifecycle hooks | `plugin.definition.ts` + `src/index.ts` |
| **Bots** | 13 | Application compositions that **wire** integrations to plugins | `bot.definition.ts` + `src/index.ts` |
| **Scripts** | 3 | One-off operational utilities | standalone `.ts` files |

---

## The Core Relationship Model

```
                    ┌─────────────┐
                    │  INTERFACE   │  defines the contract (schema + actions)
                    │  (e.g. llm)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │ implements  │            │ depends on
              ▼            │            ▼
     ┌────────────────┐    │    ┌──────────────┐
     │  INTEGRATION   │    │    │    PLUGIN     │
     │  (e.g. openai) │    │    │ (e.g. knowl) │
     └────────┬───────┘    │    └──────┬───────┘
              │            │           │
              └────────────┼───────────┘
                           │
                    ┌──────▼──────┐
                    │     BOT     │  wires integration → plugin via interface
                    │(e.g. knowl) │
                    └─────────────┘
```

**In plain terms:**

- An **Interface** says: "anything that provides LLM capability must have a `generateContent` action with this exact input/output schema."
- An **Integration** (e.g. openai) says: "I implement the `llm` interface by calling the OpenAI API."
- A **Plugin** (e.g. knowledge) says: "I need something that implements `llm` — I will call `actions.llm.generateContent()` in my hooks."
- A **Bot** (e.g. knowledgiani) says: "I am wiring the knowledge plugin's `llm` dependency to the openai integration's `llm` implementation."

This is a dependency-inversion pattern: plugins never know which integration provides their capabilities. The bot makes that decision at composition time.

---

## Packages — Foundation Layer

12 packages provide the core libraries that everything else builds on.

### Tier 1: Foundational (no internal dependencies)

#### @bpinternal/zui (v2.0.0)

- **Role:** Schema layer — enhanced Zod fork with TypeScript code generation and JSON Schema transforms.
- **Depended on by:** SDK, Cognitive, LLMz, Zai, Vai (as peer dependency).
- **Key capability:** All type contracts across the system ultimately resolve to Zui schemas.

#### @botpress/client (v1.37.0)

- **Role:** HTTP layer — type-safe REST client for the Botpress platform API.
- **Exports:** Namespaced operations: `runtime`, `admin`, `billing`, `files`, `tables`, `public`.
- **Depended on by:** SDK, Cognitive, Chat-client, Common, CLI, Zai, Vai.

#### @botpress/chat-api (private)

- **Role:** Chat domain Zod schemas — authoritative type definitions for messages, conversations, users, events.
- **Depended on by:** Chat-client.

### Tier 2: Framework (depends on Tier 1)

#### @botpress/sdk (v6.1.0)

- **Role:** Framework layer — defines `BotDefinition`, `IntegrationDefinition`, `PluginDefinition`, `InterfaceDefinition`.
- **Dependencies:** `@botpress/client`, peer: `@bpinternal/zui`.
- **Key exports:** Definition classes, handler types, message types, workflow system, table system, logging.
- **This is the package that integrations, plugins, and bots all import to declare their structure.**

#### @botpress/cognitive (v0.3.18)

- **Role:** LLM abstraction layer — wraps the Botpress client for model management, usage tracking, and generation.
- **Dependencies:** peer: `@bpinternal/zui`.
- **Key exports:** `GenerateContentInput`, `GenerateContentOutput`, `GenerationMetadata`, Cognitive client.

#### @botpress/chat (v0.5.5)

- **Role:** Chat client — ergonomic client for chat operations with SSE streaming support.
- **Dependencies:** `@botpress/chat-api` (dev).

#### @botpress/common (private)

- **Role:** Shared utilities — LLM helpers, speech-to-text, text-to-image wrappers, markdown transforms, OAuth wizard, PostHog analytics, sandbox utilities.
- **Dependencies:** `@botpress/client`, `@botpress/sdk`.

### Tier 3: AI/LLM (depends on Tier 1-2)

#### llmz (v0.0.58)

- **Role:** Code-first agent framework — an LLM-native TypeScript VM that generates and executes code with tool calling, snapshots, and UI components.
- **Key architecture:** Babel compiler pipeline → isolated-vm or QuickJS execution → tool system with Zui schemas.
- **Dependencies:** peer: `@botpress/cognitive`, `@bpinternal/zui`.

#### @botpress/zai (v2.6.4)

- **Role:** High-level LLM operations library — `extract`, `check`, `label`, `rewrite`, `filter`, `summarize`, `sort`, `rate`, `group`, `answer`, `patch`, `text`.
- **Dependencies:** `@botpress/cognitive`, peer: `@bpinternal/zui`.
- **Key feature:** Active learning via storage adapters (Botpress Table or in-memory).

#### @botpress/vai (v0.0.18)

- **Role:** Vitest AI extension — LLM-powered test assertions (`compare`, `check`, `extract`, `filter`, `rate`).
- **Dependencies:** peer: `@botpress/client`, `@bpinternal/zui`, `vitest`.

### Tier 4: Tools

#### @botpress/cli (v6.0.0)

- **Role:** Developer CLI — scaffolding, building, deploying, and validating bots, integrations, and plugins.
- **Dependencies:** `@botpress/chat`, `@botpress/client`, `@botpress/sdk`.
- **Key feature:** Code generation for integration/bot/plugin packages, custom BPLint linter, esbuild compilation.

#### @botpress/sdk-addons (private)

- **Role:** Optional SDK extensions — currently only Sentry error tracking integration.
- **Dependencies:** `@botpress/sdk`.

### Package Dependency Graph

```
@bpinternal/zui ──────────────────────────────────────────┐
                                                           │ (peer dep)
@botpress/client ──┬─── @botpress/sdk ──┬─── @botpress/cli
                   │                    ├─── @botpress/common
                   │                    └─── @botpress/sdk-addons
                   │
                   ├─── @botpress/cognitive ──┬─── @botpress/zai
                   │                          ├─── llmz
                   │                          └─── @botpress/vai
                   │
@botpress/chat-api ──── @botpress/chat ──── @botpress/cli
```

---

## Interfaces — Capability Contracts

13 interfaces define standardized capability contracts with zero implementation. Each declares:

- **Entities** — Zod schemas for domain objects (e.g. `modelRef`, `item`, `hitlSession`)
- **Actions** — callable methods with typed input/output (e.g. `generateContent`, `list`, `create`)
- **Events** — emittable signals (e.g. `created`, `hitlAssigned`, `fileCreated`)
- **Channels** — optional message channel definitions (used by `hitl`)

### Interface Inventory

| Category | Interface | Actions | Entities | Events |
|----------|-----------|---------|----------|--------|
| **CRUD** | `listable` | `list` | `item` | — |
| | `readable` | `read` | `item` | — |
| | `creatable` | `create` | `item` | `created` |
| | `updatable` | `update` | `item` | — |
| | `deletable` | `delete` | `item` | — |
| **AI** | `llm` | `generateContent`, `listLanguageModels` | `modelRef` | — |
| | `text-to-image` | `generateImage` | `imageModelRef` | — |
| | `speech-to-text` | `transcribeAudio` | `speechToTextModelRef` | — |
| **Workflow** | `hitl` | `createUser`, `startHitl`, `stopHitl` | `hitlSession` | `hitlAssigned`, `hitlStopped` |
| **Messaging** | `typing-indicator` | `startTypingIndicator`, `stopTypingIndicator` | — | — |
| | `proactive-conversation` | (conversation initiation) | — | — |
| | `proactive-user` | (user creation) | — | — |
| **Files** | `files-readonly` | `listItemsInFolder`, `transferFileToBotpress` | — | `fileCreated`, `fileUpdated`, `fileDeleted`, `folderDeletedRecursive` |

### Interface Definition Pattern

```typescript
import { InterfaceDefinition, z } from '@botpress/sdk'

export default new InterfaceDefinition({
  name: 'llm',
  version: '9.0.1',
  entities: {
    modelRef: { schema: z.object({ id: z.string() }) },
  },
  actions: {
    generateContent: {
      billable: true,
      cacheable: true,
      input: { schema: GenerateContentInputSchema },
      output: { schema: GenerateContentOutputSchema },
    },
    listLanguageModels: {
      input: { schema: z.object({}) },
      output: { schema: z.object({ models: z.array(ModelSchema) }) },
    },
  },
})
```

### Key Characteristics

- Interfaces contain **no runtime code** — only three files: `interface.definition.ts`, `package.json`, `tsconfig.json`.
- They are consumed via the `.extend()` method on integration definitions and the `interfaces` field on plugin definitions.
- Version compatibility is enforced via `sdk.version.allWithinMajorOf()`.

---

## Integrations — External Connectors

68 integrations connect the Botpress platform to external services. Each has two layers:

1. **Definition** (`integration.definition.ts`) — declares capabilities, channels, actions, events, configuration, and which interfaces it implements.
2. **Runtime** (`src/index.ts`) — implements the handler logic, webhook processing, and action execution.

### Integration Categories

| Category | Integrations | Common Interfaces |
|----------|-------------|-------------------|
| **Communication** | slack, telegram, teams, messenger, whatsapp, line, viber, vonage, twilio, instagram | `typing-indicator` |
| **AI/LLM** | openai, anthropic, google-ai, mistral-ai, groq, cerebras, fireworks-ai | `llm`, `speech-to-text`, `text-to-image` |
| **CRM/Sales** | hubspot, pipedrive, attio, intercom | CRUD interfaces |
| **Productivity** | notion, confluence, asana, monday, clickup, github, linear, trello, todoist, jira | `files-readonly`, CRUD interfaces |
| **Email** | gmail, sendgrid, mailchimp, resend, loops | — |
| **Data** | gsheets, googledrive, airtable, dropbox | `files-readonly` |
| **Support** | zendesk, zendesk-messaging-hitl | `hitl` |
| **Utility** | webhook, browser, charts, dalle, pdf-generator, calcom, calendly, stripe | varies |

### Integration Definition Pattern

```typescript
import { IntegrationDefinition, z, messages } from '@botpress/sdk'
import typingIndicator from '../interfaces/typing-indicator'
import llm from '../interfaces/llm'

export default new IntegrationDefinition({
  name: 'openai',
  version: '14.0.0',
  title: 'OpenAI',
  icon: 'icon.svg',
  readme: 'hub.md',

  configuration: {
    schema: z.object({ apiKey: z.string() }),
  },
  secrets: { OPENAI_API_KEY: {} },
  entities: {
    modelRef: { schema: z.object({ id: z.string() }) },
  },
  actions: {
    generateSpeech: { input: { schema: ... }, output: { schema: ... } },
  },
  events: {},
  channels: {},
  attributes: { category: 'AI Models' },
})
  .extend(llm, ({ entities }) => ({
    entities: { modelRef: entities.modelRef },
  }))
  .extend(speechToText, ({ entities }) => ({
    entities: { speechToTextModelRef: entities.modelRef },
  }))
  .extend(textToImage, ({ entities }) => ({
    entities: { imageModelRef: entities.modelRef },
  }))
```

### Runtime Implementation Pattern

```typescript
import * as bp from '.botpress'

export default new bp.Integration({
  register: async ({ webhookUrl, ctx, logger }) => {
    // Setup: register webhooks, validate credentials, initialize state
  },

  unregister: async ({ ctx }) => {
    // Cleanup: remove webhooks, release resources
  },

  handler: async ({ req, client, ctx, logger }) => {
    // Inbound webhook handler
    // Parse incoming payload → client.createMessage()
  },

  actions: {
    generateContent: async ({ input, ctx, client }) => {
      // Implement the llm interface action
      const response = await openaiClient.chat.completions.create(...)
      return { output: transformedResponse }
    },
  },

  channels: {
    channel: {
      messages: {
        text: async ({ payload, ctx, conversation, client }) => {
          // Send text message to external service
        },
        image: async ({ payload, ctx, conversation, client }) => {
          // Send image message
        },
      },
    },
  },
})
```

### How Integrations Implement Interfaces

The `.extend()` method on the definition maps the interface's abstract entities to the integration's concrete entities:

```typescript
// "I implement the llm interface, and my modelRef entity matches yours"
.extend(llm, ({ entities }) => ({
  entities: { modelRef: entities.modelRef },
}))
```

At runtime, the integration must implement all actions declared by the interface. The type system enforces this at build time.

### Build-Time Resolution

The `bpDependencies` field in `package.json` points to the interface directories this integration consumes:

```json
{
  "bpDependencies": {
    "typing-indicator": "../../interfaces/typing-indicator",
    "llm": "../../interfaces/llm",
    "speech-to-text": "../../interfaces/speech-to-text"
  }
}
```

Running `bp build` generates a `.botpress/` directory with fully typed handler signatures derived from the definition + interface contracts.

---

## Plugins — Bot Middleware

8 plugins extend bot behavior by hooking into lifecycle events. They differ from integrations in a critical way: **plugins do not connect to external services directly**. Instead, they declare abstract interface dependencies and call them — the bot decides which integration fulfills them.

### Plugin Inventory

| Plugin | Purpose | Interface Dependencies |
|--------|---------|----------------------|
| `knowledge` | Extract questions from messages, search documents, post answers | `llm` |
| `personality` | Rewrite outgoing bot messages with a configured personality | `llm` |
| `hitl` | Manage human-in-the-loop escalation sessions | `hitl` |
| `analytics` | Track and analyze bot interactions | — |
| `conversation-insights` | Generate insights about conversations | — |
| `logger` | Log bot activities | — |
| `file-synchronizer` | Sync files between systems | `files-readonly` |
| `synchronizer` | Generic data synchronization | CRUD interfaces |

### Plugin Definition Pattern

```typescript
import { PluginDefinition, z } from '@botpress/sdk'
import llm from '../interfaces/llm'

export default new PluginDefinition({
  name: 'knowledge',
  version: '1.0.0',
  title: 'Knowledge Base',

  configuration: {
    schema: z.object({
      maxResults: z.number().default(3),
    }),
  },

  // Abstract interface dependencies — NOT tied to any specific integration
  interfaces: {
    llm: sdk.version.allWithinMajorOf(llm),
  },

  actions: {
    searchKnowledge: {
      input: { schema: z.object({ query: z.string() }) },
      output: { schema: z.object({ results: z.array(z.string()) }) },
    },
  },

  states: {
    conversation: {
      schema: z.object({ lastQuery: z.string().optional() }),
    },
  },
})
```

### Plugin Runtime Pattern

```typescript
import * as bp from '.botpress'

const plugin = new bp.Plugin({
  actions: {
    searchKnowledge: async ({ input, client }) => {
      // implement plugin-provided actions
    },
  },
})

// Hook into bot lifecycle — this is the primary plugin mechanism
plugin.on.beforeIncomingMessage('*', async ({ data, client, actions }) => {
  // Intercept every incoming message
  // Call interface actions abstractly:
  const llmResponse = await actions.llm.generateContent({
    messages: [{ role: 'user', content: data.payload.text }],
  })
  // Search knowledge base, post answer, etc.
})

plugin.on.beforeOutgoingMessage('*', async ({ data, actions }) => {
  // Modify every outgoing message (used by personality plugin)
})

plugin.on.beforeIncomingEvent('eventName', async ({ data, actions }) => {
  // React to specific events
})

export default plugin
```

### Plugin Lifecycle Hooks

| Hook | When It Fires | Common Use |
|------|--------------|------------|
| `beforeIncomingMessage` | Message received from user, before bot processes it | knowledge: extract question and search |
| `beforeOutgoingMessage` | Bot sends a response, before it reaches the channel | personality: rewrite with personality |
| `beforeIncomingEvent` | Custom event received, before bot processes it | hitl: handle escalation events |

### Key Distinction: Plugin vs Integration

| Aspect | Integration | Plugin |
|--------|------------|--------|
| Connects to external service | Yes | No |
| Implements interfaces | Yes (via `.extend()`) | No |
| Consumes interfaces | No | Yes (via `interfaces` field) |
| Has webhook handler | Yes | No |
| Has lifecycle hooks | No | Yes (`beforeIncomingMessage`, etc.) |
| Needs wiring in bot | Added directly | Added with dependency mapping |

---

## Bots — The Composition Layer

13 example bots demonstrate how to compose integrations and plugins into working applications. The bot is the only component that creates concrete bindings between abstract plugin dependencies and specific integration implementations.

### Bot Definition Pattern

```typescript
import { BotDefinition } from '@botpress/sdk'
import telegram from '../integrations/telegram'
import openai from '../integrations/openai'
import knowledge from '../plugins/knowledge'
import personality from '../plugins/personality'

export default new BotDefinition({
  configuration: {
    schema: z.object({ welcomeMessage: z.string() }),
  },
  states: {
    conversation: { schema: z.object({ topic: z.string().optional() }) },
  },
  events: {},
  user: { tags: {} },
  conversation: { tags: {} },
})
  // Add integrations (external connections)
  .addIntegration(telegram, {
    enabled: true,
    configuration: { botToken: '{{secrets.TELEGRAM_TOKEN}}' },
  })
  .addIntegration(openai, {
    enabled: true,
    configuration: { apiKey: '{{secrets.OPENAI_KEY}}' },
  })

  // Add plugins WITH dependency wiring
  .addPlugin(knowledge, {
    configuration: { maxResults: 3 },
    dependencies: {
      llm: {
        integrationAlias: 'openai',                // use the openai integration...
        integrationInterfaceAlias: 'llm<modelRef>', // ...as the llm provider
      },
    },
  })
  .addPlugin(personality, {
    configuration: {
      model: 'gpt-4',
      personality: 'Respond as a helpful assistant.',
    },
    dependencies: {
      llm: {
        integrationAlias: 'openai',
        integrationInterfaceAlias: 'llm<modelRef>',
      },
    },
  })
```

### Bot Runtime Pattern

```typescript
import * as bp from '.botpress'

const bot = new bp.Bot({ actions: {} })

bot.on.message('text', async ({ message, client, ctx }) => {
  // Handle text messages
})

bot.on.message('file', async ({ message, client, ctx }) => {
  // Handle file uploads
})

bot.on.event('*', async ({ event, client }) => {
  // Handle custom events
})

export default bot
```

### The Wiring Mechanism

The `dependencies` field in `.addPlugin()` is the critical binding:

```typescript
dependencies: {
  llm: {                                    // plugin's interface dependency name
    integrationAlias: 'openai',             // which integration provides it
    integrationInterfaceAlias: 'llm<modelRef>', // which interface implementation on that integration
  },
}
```

This means:
- When the `knowledge` plugin calls `actions.llm.generateContent()` at runtime...
- The bot routes that call to the `openai` integration's `llm` interface implementation...
- Which calls the OpenAI API and returns the result.

The plugin never knows it is talking to OpenAI. You could swap `openai` for `anthropic` by changing one line in the bot definition.

### Bot Inventory

| Bot | Integrations | Plugins | Purpose |
|-----|-------------|---------|---------|
| `knowledgiani` | telegram, openai | knowledge, personality | Knowledge Q&A with personality |
| `hit-looper` | chat, zendesk | hitl | Human-in-the-loop demo |
| `slackbox` | slack | — | Slack bot |
| `bugbuster` | github | — | Issue tracking |
| `drop-weaver` | dropbox | — | File management |
| `sinlin` | slack, telegram | — | Multi-channel bot |
| `echo` | chat | — | Echo/reflection bot |
| `hello-world` | (minimal) | — | Starter template |
| `clog` | chat | logger | Conversation logger |
| `notionaut` | notion | — | Notion integration |
| `sheetzy` | gsheets, telegram | — | Google Sheets bot |
| `doppel-doer` | chat | — | Action repeater |
| `synchrotron` | (multiple) | synchronizer | Multi-system sync |

---

## Scripts — Operational Utilities

3 standalone TypeScript files in `/scripts/` for DevOps tasks:

| Script | Purpose |
|--------|---------|
| `dynamodb-create-table.ts` | DynamoDB table setup |
| `fetch-chat-wh.ts` | Webhook fetching |
| `upload-sandbox-scripts.ts` | Sandbox script upload |

These have no relationship to the other component types. They are one-off operational tools.

---

## Package Dependency Tiers

```
TIER 1 — Foundational (no internal deps)
├── @bpinternal/zui         schema validation for everything
├── @botpress/client        HTTP client for Botpress API
└── @botpress/chat-api      chat domain Zod schemas

TIER 2 — Framework (depends on Tier 1)
├── @botpress/sdk           Bot/Integration/Plugin/Interface definition classes
├── @botpress/cognitive     LLM abstraction layer
├── @botpress/chat          chat client with SSE
└── @botpress/common        shared utilities

TIER 3 — AI/LLM (depends on Tier 1-2)
├── llmz                    code-first agent VM
├── @botpress/zai           high-level LLM operations
└── @botpress/vai           vitest AI testing assertions

TIER 4 — Tools
├── @botpress/cli           developer CLI
└── @botpress/sdk-addons    optional extensions (Sentry)
```

### Cross-Tier Dependencies

```
@bpinternal/zui is a peer dependency of: SDK, Cognitive, LLMz, Zai, Vai
@botpress/client is depended on by: SDK, Cognitive, Chat, Common, CLI, Zai, Vai
@botpress/cognitive is depended on by: Zai, LLMz (peer), Vai (indirect)
@botpress/sdk is depended on by: CLI, Common, SDK-addons
```

---

## End-to-End Message Flow

A complete request-response cycle through a knowledge bot:

```
1.  User types message in Telegram
     │
2.  Telegram sends webhook POST to Botpress
     │
3.  telegram integration's handler() receives the webhook
     │
4.  handler parses payload → calls client.createMessage()
     │
5.  knowledge plugin's beforeIncomingMessage hook fires
     │
6.  Plugin calls actions.llm.generateContent() (abstract interface call)
     │
7.  Bot wiring resolves llm → openai integration
     │
8.  openai integration calls OpenAI API
     │
9.  LLM response flows back to knowledge plugin
     │
10. Plugin searches knowledge base with extracted question
     │
11. Plugin creates answer message via client.createMessage()
     │
12. personality plugin's beforeOutgoingMessage hook fires
     │
13. Plugin rewrites message with personality via actions.llm.generateContent()
     │
14. Bot wiring resolves to openai again → OpenAI API call
     │
15. Rewritten message sent to telegram integration
     │
16. telegram integration calls Telegram Bot API
     │
17. User sees response in Telegram
```

---

## Exceptions and Notable Patterns

### 1. Integrations with No Interface

Many simpler integrations (e.g. `webhook`, `charts`, `pdf-generator`) do not extend any interface. They define custom actions and channels directly. **Interfaces are optional** — they are used when a capability should be abstractly swappable (like LLM providers).

### 2. Integrations Implementing Multiple Interfaces

`openai` implements three interfaces: `llm` + `text-to-image` + `speech-to-text`. This is composition, not inheritance — each `.extend()` call adds one interface contract.

### 3. Plugins with No Interface Dependency

`logger`, `analytics`, and `conversation-insights` hook into events without needing any interface provider. They operate purely on bot lifecycle data.

### 4. The `bpDependencies` Field

In `package.json`, integrations and plugins declare interface references via `bpDependencies` using relative filesystem paths:

```json
{
  "bpDependencies": {
    "llm": "../../interfaces/llm",
    "typing-indicator": "../../interfaces/typing-indicator"
  }
}
```

This is a build-time resolution mechanism separate from npm dependencies.

### 5. Generated Type System

Running `bp build` generates a `.botpress/` directory containing fully typed TypeScript from the definition files + interface contracts. All handler signatures, action inputs/outputs, and entity types are generated. Developers get full autocomplete without manually importing interface schemas.

### 6. The Cognitive/Zai/LLMz AI Stack

These three packages form a layered AI stack that exists alongside but separate from the interface system:

- **cognitive** wraps the Botpress client for LLM calls with model management and usage tracking
- **zai** provides high-level operations (`extract`, `summarize`, `check`, `label`, `filter`, `rewrite`, `sort`, `rate`, `group`, `answer`, `patch`)
- **llmz** is an agent VM that generates and executes TypeScript code with tool calling and snapshots

Bots and integrations can use these packages directly without going through the interface system. The `llm` interface is the platform-level abstraction; `cognitive`/`zai`/`llmz` are the package-level tools.

### 7. No Central Registry

Discovery is convention-based. The monorepo workspace config (`pnpm-workspace.yaml`) declares workspace members:

```yaml
packages:
  - packages/*
  - packages/cli/templates/*
  - integrations/*
  - interfaces/*
  - bots/*
  - plugins/*
```

Turbo builds everything it finds. There is no separate registration step.

### 8. Dual Definition/Runtime Pattern

Every integration, plugin, and bot has two files:
- A **definition** file (declarative — what it can do)
- A **runtime** file (imperative — how it does it)

The definition is used at build time for type generation and validation. The runtime is used at execution time for actual behavior.

---

## Connection Diagrams

### Master Relationship Map — All Component Connections

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              BOTPRESS PLATFORM (Cloud)                              │
│                          HTTP message bus / action router                            │
└──────────┬──────────────────────┬──────────────────────┬───────────────────────┬─────┘
           │                      │                      │                       │
           │ HTTP                  │ HTTP                  │ HTTP                   │ HTTP
           │                      │                      │                       │
    ┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐         ┌──────▼──────┐
    │     BOT     │        │ INTEGRATION │        │ INTEGRATION │         │ INTEGRATION │
    │   SERVER    │        │   openai    │        │  telegram   │         │   zendesk   │
    │             │        │             │        │             │         │             │
    │ ┌─────────┐ │        │  actions:   │        │  channels:  │         │  actions:   │
    │ │ HOOKS   │ │        │  generate   │        │  text,image │         │  startHitl  │
    │ │ before/ │ │        │  Content    │◄──┐    │  handler()  │         │  stopHitl   │
    │ │ after   │ │        │  listModels │   │    │  register() │         │  createUser │
    │ └────┬────┘ │        └─────────────┘   │    └─────────────┘         └─────────────┘
    │      │      │              ▲            │           ▲                       ▲
    │ ┌────▼────┐ │              │            │           │                       │
    │ │ PLUGINS │ │              │ .extend()  │           │ .extend()             │ .extend()
    │ │         │ │              │            │           │                       │
    │ │knowledge├─┼──actions.llm.│            │     ┌─────┴──────┐         ┌─────┴──────┐
    │ │         │ │  generate    │            │     │  INTERFACE  │         │  INTERFACE  │
    │ │         │ │  Content()───┘            │     │  typing-    │         │    hitl     │
    │ │person-  │ │                           │     │  indicator  │         │             │
    │ │ality   ├─┼──actions.llm.──────────────┘     └────────────┘         └─────────────┘
    │ │         │ │  generate
    │ │         │ │  Content()          ┌────────────┐
    │ │hitl    ├─┼──actions.hitl.──────►│  INTERFACE │
    │ │         │ │  startHitl()        │    llm     │
    │ └─────────┘ │                     │            │
    │             │                     │ entities:  │
    │ ┌─────────┐ │                     │  modelRef  │
    │ │HANDLERS │ │                     │ actions:   │
    │ │on.msg() │ │                     │  generate  │
    │ │on.event│ │                     │  Content   │
    │ └─────────┘ │                     │  listLang  │
    └─────────────┘                     │  Models    │
                                        └────────────┘
```

### Build-Time vs Runtime Connections

```
BUILD TIME                                          RUNTIME
══════════                                          ═══════

interface.definition.ts ──────┐
  (Zod schemas, actions)      │
                              │ .extend()
integration.definition.ts ◄───┘               integration server
  (declares capabilities)                       │
         │                                      │ HTTP POST
         │ bp build                             │ { type: "openai:generateContent" }
         ▼                                      │
  .botpress/ (generated types)                  ▼
                                          instance.actions[type](input)
                                                │
                                                ▼
                                          OpenAI API call


plugin.definition.ts ─────────┐
  (interfaces: { llm })       │
                              │ bp build
bot.definition.ts ◄───────────┘           bot server
  .addIntegration(openai)                   │
  .addPlugin(knowledge, {                   │ event_received
    dependencies: {                         ▼
      llm: {                          before_incoming_message hooks
        integrationAlias: 'openai'          │
      }                                     │ plugin calls actions.llm.generateContent()
    }                                       ▼
  })                                  Proxy resolves:
         │                              props.interfaces['llm'].integrationAlias = 'openai'
         │ bp build                     props.interfaces['llm'].actions['generateContent'].name
         ▼                                  │
  bp_modules/ (wiring metadata)             ▼
  PluginRuntimeProps {                client.callAction({ type: 'openai:generateContent' })
    interfaces: {                           │
      llm: {                                │ HTTP to platform
        integrationAlias: 'openai',         ▼
        actions: { ... }              platform routes to openai integration server
      }                                     │
    }                                       ▼
  }                                   integration executes action
```

### Package Dependency Graph

```
                        ┌──────────────┐
                        │@bpinternal/  │
                        │    zui       │  TIER 1: No internal deps
                        │  (v2.0.0)    │
                        └──┬───┬───┬───┘
                  peer     │   │   │   peer
          ┌────────────────┘   │   └────────────────────┐
          │                    │ peer                    │
          │    ┌───────────────┼──────────────┐          │
          ▼    │               ▼              │          ▼
   ┌──────────────┐    ┌─────────────┐  ┌────┴────┐ ┌──────┐
   │ @botpress/   │    │ @botpress/  │  │@botpress│ │@bot- │
   │    sdk       │◄───┤   client    │  │/cognit- │ │press/│
   │  (v6.1.0)    │    │  (v1.37.0)  │  │  ive    │ │ vai  │
   └──┬───┬───┬───┘    └──┬──┬──┬──┬─┘  │(v0.3.18)│ │(0.18)│
      │   │   │           │  │  │  │    └──┬──┬───┘ └──────┘
      │   │   │           │  │  │  │       │  │
      ▼   │   ▼           │  │  │  │       ▼  │          TIER 2: Framework
┌────────┐│┌────────┐     │  │  │  │  ┌──────┐│
│@botpress││@botpress│     │  │  │  │  │@bot- ││
│/common ││/sdk-    │     │  │  │  │  │press/││
│(private)││addons  │     │  │  │  │  │ zai  ││
└────────┘│└────────┘     │  │  │  │  │(2.6) ││
          │               │  │  │  │  └──────┘│
          ▼               │  │  │  │          │          TIER 3: AI/LLM
      ┌──────────┐        │  │  │  │          │
      │@botpress/│        │  │  │  │      ┌───▼──┐
      │   cli    │◄───────┘  │  │  │      │ llmz │
      │ (v6.0.0) │           │  │  │      │(0.58)│
      └──────────┘           │  │  │      └──────┘
                             │  │  │
     ┌───────────────┐       │  │  │                     TIER 4: Tools
     │@botpress/     │◄──────┘  │  │
     │  chat-api     │          │  │
     │  (private)    │          │  │
     └───────┬───────┘          │  │
             │                  │  │
             ▼                  │  │
     ┌───────────────┐          │  │
     │ @botpress/    │◄─────────┘  │
     │    chat       │             │
     │  (v0.5.5)     │             │
     └───────────────┘             │
                                   │
     All integrations, ◄───────────┘
     plugins, bots
     depend on client + sdk
```

### Interface Implementation Map

```
INTERFACE                  IMPLEMENTING INTEGRATIONS
─────────                  ────────────────────────────────────────────

llm ──────────────────────► openai, anthropic, google-ai, mistral-ai,
                            groq, cerebras, fireworks-ai

text-to-image ────────────► openai, dalle

speech-to-text ───────────► openai

typing-indicator ─────────► slack, telegram, teams, messenger, whatsapp,
                            line, viber, vonage, twilio, instagram

hitl ─────────────────────► zendesk-messaging-hitl

files-readonly ───────────► notion, dropbox, googledrive

listable ─────────────────► hubspot, pipedrive, attio, (CRM integrations)
readable ─────────────────► hubspot, pipedrive, attio
creatable ────────────────► hubspot, pipedrive, attio
updatable ────────────────► hubspot, pipedrive, attio
deletable ────────────────► hubspot, pipedrive, attio

proactive-conversation ───► (channel integrations with outbound support)
proactive-user ───────────► (channel integrations with user creation)


INTERFACE                  CONSUMING PLUGINS
─────────                  ─────────────────

llm ──────────────────────► knowledge, personality, conversation-insights

hitl ─────────────────────► hitl

files-readonly ───────────► file-synchronizer

CRUD (listable, etc.) ────► synchronizer


NO INTERFACE:               analytics, logger (hook into events directly)
```

### Plugin Hook Execution Chain

```
                    INCOMING MESSAGE
                          │
                          ▼
              ┌───────────────────────┐
              │  before_incoming_     │
              │  message hooks        │
              │  ┌─────────────────┐  │
              │  │ knowledge plugin│──┼──► actions.llm.generateContent()
              │  │ (extract query) │  │         │
              │  └─────────────────┘  │         │ Proxy resolves → openai
              │  ┌─────────────────┐  │         ▼
              │  │ hitl plugin     │  │    HTTP to platform → integration
              │  │ (check session) │  │
              │  └─────────────────┘  │
              │                       │
              │  Can STOP chain:      │
              │  return { stop: true }│
              │  Can MUTATE data:     │
              │  return { data: ... } │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  bot.on.message()     │
              │  handlers             │
              │  (bot's own logic)    │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  after_incoming_      │
              │  message hooks        │
              └───────────┬───────────┘
                          │
                          ▼
                   BOT SENDS REPLY
                   client.createMessage()
                          │
                          ▼
              ┌───────────────────────┐
              │  before_outgoing_     │
              │  message hooks        │
              │  ┌─────────────────┐  │
              │  │personality plugin──┼──► actions.llm.generateContent()
              │  │ (rewrite w/     │  │         │
              │  │  personality)   │  │         │ Proxy resolves → openai
              │  └─────────────────┘  │         ▼
              └───────────┬───────────┘   HTTP to platform → integration
                          │
                          ▼
              ┌───────────────────────┐
              │  HTTP to platform     │
              │  platform routes to   │
              │  telegram integration │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  telegram integration │
              │  channels.channel.    │
              │  messages.text()      │
              │  → Telegram Bot API   │
              └───────────┬───────────┘
                          │
                          ▼
                    USER SEES REPLY
```

### AI Stack — Cognitive / Zai / LLMz

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CODE                                │
│                                                                 │
│  Option A:              Option B:              Option C:        │
│  zai.extract(text,      execute({              cognitive        │
│    schema)                tools: [...],          .generateContent│
│                           instructions:          ({ model,      │
│                           '...'                    messages })   │
│                         })                                      │
└──────┬──────────────────────┬──────────────────────┬────────────┘
       │                      │                      │
       ▼                      ▼                      │
┌─────────────┐        ┌─────────────┐               │
│   ZAI       │        │   LLMZ      │               │
│             │        │             │               │
│ Operations: │        │ 1. Build    │               │
│ extract     │        │    prompt   │               │
│ check       │        │ 2. Generate │               │
│ label       │        │    TS code  │               │
│ rewrite     │        │ 3. Compile  │               │
│ filter      │        │    (Babel)  │               │
│ summarize   │        │ 4. Execute  │               │
│ sort        │        │    in VM    │               │
│ rate        │        │ 5. Run      │               │
│ group       │        │    tools    │               │
│ answer      │        │ 6. Loop or  │               │
│ patch       │        │    exit     │               │
│ text        │        │             │               │
│             │        │ Tools can   │               │
│ + Active    │        │ call Zai:   │               │
│   Learning  │        │ new Tool({  │               │
│ + Chunking  │        │   handler:  │               │
│ + Retry     │        │   () =>     │               │
│             │        │   zai.ext() │               │
│             │        │ })          │               │
└──────┬──────┘        └──────┬──────┘               │
       │                      │                      │
       │     ┌────────────────┘                      │
       ▼     ▼                                       │
┌─────────────────┐                                  │
│   COGNITIVE     │◄─────────────────────────────────┘
│                 │
│ Model selection │    'best' → ranked preference list
│                 │    'fast' → cheapest available
│ Retry + fallback│    'openai:gpt-4' → specific
│                 │
│ Event system    │    request, response, error,
│                 │    retry, fallback, aborted
│ Interceptors    │
└────────┬────────┘
         │
         │ client.callAction({
         │   type: 'openai:generateContent',
         │   input: { model: { id: 'gpt-4' }, messages: [...] }
         │ })
         │
         ▼
┌─────────────────┐         ┌─────────────────┐
│ @botpress/client│────────►│ BOTPRESS        │
│                 │  HTTP    │ PLATFORM        │
│ callAction()    │         │                 │
│ createMessage() │         │ Routes to       │
│ getState()      │         │ integration     │
│ uploadFile()    │         │ server          │
│ searchFiles()   │         └────────┬────────┘
└─────────────────┘                  │
                                     ▼
                            ┌─────────────────┐
                            │ OPENAI          │
                            │ INTEGRATION     │
                            │                 │
                            │ actions:        │
                            │   generateContent()
                            │     → OpenAI API│
                            └─────────────────┘
```

### Complete Runtime Call — Single Action Resolution

```
actions.llm.generateContent({ messages: [...] })
│
│  ① Proxy (proxy.ts)
│     integrationOrInterfaceAlias = 'llm'
│     actionName = 'generateContent'
│
│  ② Lookup (PluginRuntimeProps)
│     props.interfaces['llm'].integrationAlias → 'openai'
│     props.interfaces['llm'].actions['generateContent'].name → 'generateContent'
│
│  ③ Build action type string
│     type = 'openai:generateContent'
▼
client.callAction({ type: 'openai:generateContent', input: {...} })
│
│  ④ BotSpecificClient._run() (bot/client/index.ts)
│     before hooks: before_outgoing_call_action['openai:generateContent']
│
│  ⑤ Underlying Client HTTP POST
│     POST /v1/chat/actions/call
│     Headers: { botId, integrationId }
│     Body: { type: 'openai:generateContent', input: {...} }
▼
BOTPRESS PLATFORM
│
│  ⑥ Routes to openai integration server instance
│     Headers: { operation: 'action_triggered', type: 'generateContent' }
▼
INTEGRATION SERVER (integration/server/index.ts)
│
│  ⑦ onActionTriggered()
│     const { input, type } = parseBody(req)
│     const action = instance.actions['generateContent']
│     const output = await action({ ctx, input, client, logger })
▼
INTEGRATION ACTION HANDLER
│
│  ⑧ Calls external API
│     openai.chat.completions.create({ model: 'gpt-4', messages: [...] })
│
│  ⑨ Returns { output: { choices: [...], usage: {...} } }
▼
RESPONSE FLOWS BACK
│
│  ⑩ Integration server → JSON response → platform → client
│     BotSpecificClient: after_outgoing_call_action hooks
│     Proxy: .then(res => res.output)
▼
Plugin receives output
```

---

## Interoperational Relationships — Runtime Mechanics

This section traces the actual code paths that connect components at runtime, based on the SDK source code.

### Relationship 1: Interface → Integration (Implementation Contract)

**Build time only.** Interfaces have zero runtime presence. Their role ends at code generation.

When an integration calls `.extend(llm, ...)` in its definition, the CLI's build step (`bp build`) merges the interface's action signatures into the integration's generated types. The result is a `.botpress/` directory where the integration's `actions` object is typed to include `generateContent` with the exact input/output schemas from the `llm` interface.

At runtime, the integration server (`packages/sdk/src/integration/server/index.ts`) receives an `action_triggered` operation and dispatches it:

```typescript
// integration server — onActionTriggered
const { input, type } = parseBody<ActionPayload>(req)
const action = instance.actions[type]   // lookup by action name string
const output = await action({ ctx, input, client, type, logger, metadata })
return { body: JSON.stringify({ output }) }
```

The integration does not know or care that `generateContent` came from an interface. It's just an action name in a map. The interface's contribution was enforcing that the action exists and has the right types — purely at compile time.

**Key source:** `packages/sdk/src/integration/server/index.ts:189-209`

---

### Relationship 2: Interface → Plugin (Consumption Contract)

Plugins declare interface dependencies in their definition:

```typescript
interfaces: {
  llm: sdk.version.allWithinMajorOf(llm),
}
```

At runtime, the plugin accesses interface actions through a **JavaScript Proxy** (`packages/sdk/src/plugin/action-proxy/proxy.ts`). This is the critical interop mechanism:

```typescript
export const proxyActions = (client, props) =>
  new Proxy({}, {
    get: (_target, integrationOrInterfaceAlias) =>
      new Proxy({}, {
        get: (_target, actionName) => (input) => {
          // Resolve: which integration fulfills this interface?
          const integrationAlias =
            props.integrations[integrationOrInterfaceAlias]?.integrationAlias ??
            props.interfaces[integrationOrInterfaceAlias]?.integrationAlias

          // Resolve: what's the actual action name on that integration?
          const actualActionName =
            props.interfaces[integrationOrInterfaceAlias]?.actions?.[actionName]?.name
            ?? actionName

          // Make the call: "openai:generateContent"
          return client.callAction({
            type: `${integrationAlias}:${actualActionName}`,
            input,
          }).then(res => res.output)
        },
      }),
  })
```

When a plugin calls `actions.llm.generateContent(input)`:

1. The outer Proxy intercepts `llm` → looks up `props.interfaces['llm']` to find `integrationAlias: 'openai'`
2. The inner Proxy intercepts `generateContent` → resolves the actual action name
3. It calls `client.callAction({ type: 'openai:generateContent', input })` — an HTTP call to the Botpress platform
4. The platform routes it to the openai integration's server
5. The integration's `actions.generateContent` handler executes
6. The result flows back through the Proxy as a resolved Promise

**The plugin never imports, references, or knows about the openai integration.** The Proxy resolves everything at runtime from the wiring metadata the bot provided.

**Key source:** `packages/sdk/src/plugin/action-proxy/proxy.ts`

---

### Relationship 3: Bot Wiring (Plugin Dependency → Integration Fulfillment)

The bot definition creates the metadata that the Proxy above reads. From the `knowledgiani` bot:

```typescript
.addPlugin(knowledge, {
  dependencies: {
    llm: {
      integrationAlias: 'openai',
      integrationInterfaceAlias: 'llm<modelRef>',
    },
  },
})
```

At build time, `bp build` generates typed code under `bp_modules/` that captures this wiring. The bot's `BotSpecificClient` wraps the raw Botpress `Client` and intercepts every operation with before/after hooks:

```typescript
// packages/sdk/src/bot/server/index.ts
const botClient = new BotSpecificClient(vanillaClient, {
  before: {
    createMessage: async (req) => {
      // Run all before_outgoing_message hooks (plugins)
      for (const handler of bot.hookHandlers.before_outgoing_message[req.type]) {
        const hookOutput = await handler({ client, ctx, logger, data: req })
        req = hookOutput?.data ?? req
      }
      return req
    },
    callAction: async (req) => {
      // Run all before_outgoing_call_action hooks
      for (const handler of bot.hookHandlers.before_outgoing_call_action[req.type]) {
        const hookOutput = await handler({ client, ctx, logger, data: req })
        req = hookOutput?.data ?? req
      }
      return req
    },
  },
  after: {
    createMessage: async (res) => { /* after_outgoing_message hooks */ },
    callAction: async (res, req) => { /* after_outgoing_call_action hooks */ },
  },
})
```

Every `client.createMessage()` or `client.callAction()` passes through this hook chain. Plugins are registered as hooks on the bot. The execution order:

```
incoming message → before_incoming_message hooks → message handlers → after_incoming_message hooks
outgoing message → before_outgoing_message hooks → client.createMessage → after_outgoing_message hooks
action call      → before_outgoing_call_action hooks → client.callAction → after_outgoing_call_action hooks
```

**Key source:** `packages/sdk/src/bot/server/index.ts:15-133`

---

### Relationship 4: Bot Server — The Dispatch Layer

The bot server (`packages/sdk/src/bot/server/index.ts`) is the central dispatcher. It receives operations from the Botpress platform via HTTP and routes them:

```typescript
switch (ctx.operation) {
  case 'action_triggered':  → onActionTriggered  (bot-level action called)
  case 'event_received':    → onEventReceived    (message or event from integration)
  case 'register':          → onRegister         (bot lifecycle)
  case 'unregister':        → onUnregister       (bot lifecycle)
  case 'ping':              → onPing             (health check)
}
```

For `event_received`, the server further dispatches by event type:

```typescript
if (ctx.type === 'message_created') {
  // 1. Run before_incoming_message hooks (plugins like knowledge)
  // 2. Run message handlers (bot's own bot.on.message handlers)
  // 3. Run after_incoming_message hooks
}

if (ctx.type === 'workflow_update') {
  // Route to workflow handler
}

// For all other events:
// 1. Run before_incoming_event hooks
// 2. Run event handlers
// 3. Run after_incoming_event hooks
```

Hooks can **stop** the chain by returning `{ stop: true }` — preventing the message from reaching the bot's own handlers. They can also **mutate** the message data, which propagates to subsequent hooks and handlers.

**Key source:** `packages/sdk/src/bot/server/index.ts:153-268`

---

### Relationship 5: Integration Server — External Service Bridge

The integration server (`packages/sdk/src/integration/server/index.ts`) handles the other side — bridging between the Botpress platform and external services:

```typescript
switch (ctx.operation) {
  case 'webhook_received':    → onWebhook           (external service POST)
  case 'register':            → onRegister           (setup webhooks on external service)
  case 'unregister':          → onUnregister         (cleanup)
  case 'message_created':     → onMessageCreated     (bot sends message → external service)
  case 'action_triggered':    → onActionTriggered    (plugin calls action via Proxy)
  case 'create_user':         → onCreateUser         (user creation on external service)
  case 'create_conversation': → onCreateConversation (conversation creation)
  case 'ping':                → onPing               (health check)
}
```

When a plugin's `actions.llm.generateContent()` call arrives (via the Proxy → `client.callAction` → platform → integration server):

```typescript
// onActionTriggered
const { input, type } = parseBody<ActionPayload>(req)
const action = instance.actions[type]  // e.g. instance.actions['generateContent']
const output = await action({ ctx, input, client, type, logger, metadata })
return { body: JSON.stringify({ output, meta: metadata.toJSON() }) }
```

When a bot sends a message and the platform routes it to the integration for delivery:

```typescript
// onMessageCreated
const { conversation, user, type, payload, message } = parseBody(req)
const channelHandler = instance.channels[conversation.channel]
const messageHandler = channelHandler.messages[type]  // e.g. 'text', 'image'
await messageHandler({ ctx, conversation, message, user, type, client, payload, ack, logger })
```

**Key source:** `packages/sdk/src/integration/server/index.ts:89-229`

---

### Relationship 6: The HTTP Serving Layer

All components (bots, integrations, plugins) use the same serving mechanism (`packages/sdk/src/serve.ts`):

```typescript
export async function serve(handler: Handler, port: number = 8072) {
  const server = http.createServer(async (req, res) => {
    const request = await mapIncomingMessageToRequest(req)
    const response = await handler(request)
    res.writeHead(response?.status ?? 200).end(response?.body ?? '{}')
  })
  server.listen(port)
}
```

Each component is a plain HTTP server that receives JSON payloads from the Botpress cloud platform. The platform acts as the message bus — it knows which bot has which integrations and plugins, and routes operations accordingly. **Components never talk to each other directly.** All communication goes through the platform:

```
Plugin → client.callAction("openai:generateContent")
       → HTTP POST to Botpress platform
       → Platform looks up openai integration for this bot
       → HTTP POST to openai integration server
       → Integration executes and returns
       → Platform returns response to plugin
```

**Key source:** `packages/sdk/src/serve.ts`

---

### Relationship 7: The AI Stack (Cognitive → Zai → LLMz)

This is an independent interoperational chain, separate from the interface/plugin/integration system. These packages talk to each other via direct imports, not through the platform.

#### Cognitive: The Foundation

`Cognitive` wraps `@botpress/client` and calls integration actions directly:

```typescript
// packages/cognitive/src/client.ts — _generateContent method
const selection = await this._selectModel(input.model ?? 'best')
// selection = { integration: 'openai', model: 'gpt-4' }

return client.callAction({
  type: `${integration}:generateContent`,   // e.g. "openai:generateContent"
  input: { ...props.input, model: { id: model } },
})
```

Cognitive handles:
- **Model selection**: `'best'` → picks from ranked preferences list; `'fast'` → picks cheapest; `'openai:gpt-4'` → specific model
- **Retry with fallback**: If a model is down, marks it in downtimes and tries the next one
- **Event system**: Emits `request`, `response`, `error`, `retry`, `fallback`, `aborted` events
- **Interceptors**: Request/response interceptor chain for middleware

**It calls integration actions the same way plugins do** — via `client.callAction()` → platform → integration. The difference is it does this from package code rather than plugin hooks.

#### Zai: High-Level Operations on Cognitive

`Zai` wraps `Cognitive` and provides structured operations:

```typescript
// packages/zai/src/zai.ts
constructor(config: ZaiConfig) {
  this.client = Cognitive.isCognitiveClient(config.client)
    ? config.client
    : new Cognitive({ client: config.client })  // auto-wrap if raw client
}

protected async callModel(props) {
  return this.client.generateContent({
    reasoningEffort: 'none',
    ...props,
    model: this.Model,
    userId: this._userId,
  })
}
```

Each Zai operation (extract, check, label, etc.) follows the same pattern:
1. Create a `ZaiContext` (clones cognitive client for isolation, tracks usage)
2. Build a prompt with examples from the active learning adapter
3. Call `this.callModel()` → Cognitive → `client.callAction("openai:generateContent")` → platform → integration
4. Parse the LLM response using markers and JSON repair
5. Optionally save the result as a learning example
6. Return via `Response` wrapper with usage metrics

#### LLMz: Agent VM on Cognitive

`LLMz` takes a fundamentally different approach — it generates TypeScript code and executes it in a sandbox:

```typescript
// packages/llmz/src/index.ts
export const execute = async (props: ExecutionProps) => {
  const { executeContext } = await import('./llmz.js')
  return executeContext(props)
}
```

The execution loop:
1. Build prompt with tool definitions, instructions, and chat history
2. Call Cognitive's `generateContent` → LLM generates TypeScript code
3. Compile code via Babel pipeline (instrument tool calls, extract variables, track lines)
4. Execute in isolated-vm or QuickJS sandbox
5. If code calls tools → tool handlers execute → results fed back to context
6. If code returns `{ action: 'think' }` → add results to context, loop again
7. If code returns `{ action: 'done', result }` or `{ action: 'listen' }` → return

LLMz uses Cognitive as a peer dependency, not a hard dependency. It calls `cognitive.generateContent()` for code generation but the tools themselves can be arbitrary functions — they don't need to go through the Botpress platform.

#### Stack Composition

```
Direct usage (package code):
  Zai.extract(text, schema)
    → Cognitive.generateContent({ model: 'best', messages: [...] })
      → Client.callAction({ type: 'openai:generateContent', input: {...} })
        → HTTP to Botpress platform → openai integration → OpenAI API

  LLMz.execute({ tools: [...], instructions: '...' })
    → Cognitive.generateContent(...)  // generate TypeScript code
      → [same chain as above]
    → VM.execute(generatedCode)       // run in sandbox
      → tool.handler()               // arbitrary function, may or may not use platform

Platform usage (plugin hooks):
  actions.llm.generateContent(input)
    → Proxy resolves → client.callAction({ type: 'openai:generateContent' })
      → HTTP to Botpress platform → openai integration → OpenAI API
```

The AI stack and the interface system both ultimately converge on the same call: `client.callAction("integration:actionName")` → platform → integration server. The difference is who initiates it and how the routing is determined.

---

### Relationship Summary: All 7 Interop Paths

| # | Relationship | Mechanism | When |
|---|-------------|-----------|------|
| 1 | Interface → Integration | `.extend()` merges types at build time | Build |
| 2 | Interface → Plugin | `Proxy` resolves abstract calls to concrete integration actions | Runtime |
| 3 | Bot → Plugin/Integration | `dependencies` wiring populates Proxy resolution metadata | Build + Runtime |
| 4 | Bot server → Hooks/Handlers | Hook chain dispatches events through plugins then bot handlers | Runtime |
| 5 | Platform → Integration server | HTTP operations routed to integration action/channel/webhook handlers | Runtime |
| 6 | All components → Platform | `serve()` HTTP server, `client.callAction()` HTTP calls, platform as message bus | Runtime |
| 7 | Cognitive → Zai → LLMz | Direct package imports, `client.callAction()` for LLM calls | Runtime |

**The single unifying mechanism:** Every runtime interaction eventually becomes `client.callAction({ type: 'integrationAlias:actionName', input })` — an HTTP POST through the Botpress platform to an integration server. Whether it comes from a plugin Proxy, a Cognitive model call, or a bot handler, the transport is always the same.

---

## Appendix: Complete Inventory

### All 12 Packages

| Package | Version | Published | Purpose |
|---------|---------|-----------|---------|
| `@bpinternal/zui` | 2.0.0 | Internal | Zod fork with schema extensions |
| `@botpress/client` | 1.37.0 | Yes | HTTP API client |
| `@botpress/chat-api` | — | Private | Chat domain schemas |
| `@botpress/sdk` | 6.1.0 | Yes | Framework definitions |
| `@botpress/cognitive` | 0.3.18 | Yes | LLM abstraction |
| `@botpress/chat` | 0.5.5 | Yes | Chat client |
| `@botpress/common` | — | Private | Shared utilities |
| `llmz` | 0.0.58 | Yes | Agent VM framework |
| `@botpress/zai` | 2.6.4 | Yes | LLM operations library |
| `@botpress/vai` | 0.0.18 | Yes | Vitest AI testing |
| `@botpress/cli` | 6.0.0 | Yes | Developer CLI |
| `@botpress/sdk-addons` | — | Private | SDK extensions (Sentry) |

### All 13 Interfaces

`listable`, `readable`, `creatable`, `updatable`, `deletable`, `llm`, `text-to-image`, `speech-to-text`, `hitl`, `typing-indicator`, `proactive-conversation`, `proactive-user`, `files-readonly`

### All 68 Integrations

**Communication:** slack, telegram, teams, messenger, whatsapp, line, viber, vonage, twilio, instagram

**AI/LLM:** openai, anthropic, google-ai, mistral-ai, groq, cerebras, fireworks-ai

**CRM/Sales:** hubspot, pipedrive, attio, intercom

**Productivity:** notion, confluence, asana, monday, clickup, github, linear, trello, todoist, jira

**Email:** gmail, sendgrid, mailchimp, resend, loops

**Data/Files:** gsheets, googledrive, airtable, dropbox, bigcommerce-sync

**Support:** zendesk, zendesk-messaging-hitl

**Utility:** webhook, browser, charts, dalle, pdf-generator, calcom, calendly, docusign, googlecalendar, stripe, zapier, make, bamboohr, workable, tally, wechat, canny, mintlify, hunter, feature-base, sunco, yandesk, zoho, email

### All 8 Plugins

`knowledge`, `personality`, `hitl`, `analytics`, `conversation-insights`, `logger`, `file-synchronizer`, `synchronizer`

### All 13 Bots

`knowledgiani`, `hit-looper`, `slackbox`, `bugbuster`, `drop-weaver`, `sinlin`, `echo`, `hello-world`, `clog`, `notionaut`, `sheetzy`, `doppel-doer`, `synchrotron`

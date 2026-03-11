# BD2 Full System Architecture

> Open this file in VS Code with a Mermaid preview extension to see the diagrams rendered.

---

## 1. The Full Picture — What Exists vs What's Missing

```mermaid
flowchart TB
    subgraph USER["USER"]
        Browser["Browser"]
    end

    subgraph FE["FRONTEND — React"]
        direction TB
        FE_OK["Existing Pages\nUpload | ELT | Flows | Settings\nAgents | Schemas | Superuser"]
        FE_NEW["Missing Pages\nCrew Builder | Exec Dashboard\nTraces | Triggers | Tools | Teams"]
    end

    subgraph SB["SUPABASE"]
        direction TB
        SB_AUTH["Auth + RLS"]
        SB_STORE["File Storage"]
        SB_RT["Realtime"]
        SB_TABLES["Existing Tables\nsource_documents | conversion_parsing\nblocks | representations | profiles"]
        SB_NEW["Missing Tables\ncrew_defs | agent_defs | task_defs\nexecution_records | flow_states\ntrigger_configs | block_embeddings"]
        SB_EDGE["Edge Functions\ningest | conversion-complete\ntrigger-parse"]
    end

    subgraph PY["PYTHON BACKEND"]
        direction TB
        PY_OK["Existing\nconversion-service\npipeline-worker"]
        PY_NEW["Missing\nCrew Execution API\nEmbedding Service\nJob Queue · Celery+Redis\nSupabaseFlowPersistence\nWebhook Delivery"]
    end

    subgraph EXT["EXTERNAL"]
        direction TB
        Kestra["Kestra"]
        Docling["Docling"]
        CrewAI["crewAI"]
        LLMs["LLM Providers"]
    end

    Browser --> FE
    FE_OK --> SB_EDGE
    FE_OK --> SB_TABLES
    FE_OK --> Kestra
    FE_NEW -.-> SB_NEW
    FE_NEW -.-> PY_NEW
    SB_EDGE --> PY_OK
    PY_OK --> Docling
    PY_NEW -.-> CrewAI
    CrewAI -.-> LLMs
    CrewAI -.-> SB_NEW
    PY_NEW -.-> SB_NEW
    SB_AUTH --> SB_TABLES
    SB_AUTH --> SB_NEW

    style FE_OK fill:#d4edda,stroke:#28a745,color:#155724
    style SB_TABLES fill:#d4edda,stroke:#28a745,color:#155724
    style SB_EDGE fill:#d4edda,stroke:#28a745,color:#155724
    style SB_AUTH fill:#d4edda,stroke:#28a745,color:#155724
    style SB_STORE fill:#d4edda,stroke:#28a745,color:#155724
    style SB_RT fill:#d4edda,stroke:#28a745,color:#155724
    style PY_OK fill:#d4edda,stroke:#28a745,color:#155724
    style Kestra fill:#cce5ff,stroke:#004085,color:#004085
    style Docling fill:#cce5ff,stroke:#004085,color:#004085
    style CrewAI fill:#cce5ff,stroke:#004085,color:#004085
    style LLMs fill:#cce5ff,stroke:#004085,color:#004085
    style FE_NEW fill:#f8d7da,stroke:#dc3545,color:#721c24
    style SB_NEW fill:#f8d7da,stroke:#dc3545,color:#721c24
    style PY_NEW fill:#f8d7da,stroke:#dc3545,color:#721c24
```

---

## 2. Document Pipeline — End to End (Upload → Agent Knowledge)

This is the core data flow. Green = built. Red = needs building.

```mermaid
flowchart LR
    subgraph UPLOAD["1 · UPLOAD"]
        A1["User drops file"]
        A2["ingest edge fn"]
        A3["Supabase Storage"]
        A4["source_documents row"]
    end

    subgraph PARSE["2 · PARSE"]
        B1["conversion-service\nPython"]
        B2["Docling\nPDF/DOCX/PPTX"]
        B3["Pandoc\nRST/LaTeX/EPUB"]
        B4["Mdast\nMarkdown"]
    end

    subgraph EXTRACT["3 · EXTRACT"]
        C1["conversion-complete\nedge fn"]
        C2["blocks table\nheading | paragraph\ntable | code | figure"]
        C3["conversion_parsing\nmetadata + stats"]
        C4["representations\nHTML | DocTags | MD"]
    end

    subgraph EMBED["4 · EMBED"]
        D1["Embedding Service\nFastAPI endpoint"]
        D2["Embedding Provider\nOpenAI / Cohere / local"]
        D3["block_embeddings\npgvector column"]
    end

    subgraph RETRIEVE["5 · RETRIEVE"]
        E1["BlockDataKnowledgeSource\ncrewAI-compatible"]
        E2["cosine similarity\nSQL query"]
        E3["Agent gets\nrelevant chunks"]
    end

    subgraph EXECUTE["6 · EXECUTE"]
        F1["crewAI Crew\nAgent + Task"]
        F2["LLM call\nwith knowledge context"]
        F3["execution_records\nresult stored"]
    end

    A1 --> A2 --> A3
    A2 --> A4
    A2 --> B1
    B1 --> B2 & B3 & B4
    B2 & B3 & B4 --> C1
    C1 --> C2 & C3 & C4

    C2 -.-> D1
    D1 -.-> D2
    D2 -.-> D3

    D3 -.-> E1
    E1 -.-> E2
    E2 -.-> E3

    E3 -.-> F1
    F1 -.-> F2
    F2 -.-> F3

    style UPLOAD fill:#d4edda,stroke:#28a745
    style PARSE fill:#d4edda,stroke:#28a745
    style EXTRACT fill:#d4edda,stroke:#28a745
    style EMBED fill:#f8d7da,stroke:#dc3545
    style RETRIEVE fill:#f8d7da,stroke:#dc3545
    style EXECUTE fill:#f8d7da,stroke:#dc3545
```

---

## 3. Crew Execution Pipeline — The Agent Side

```mermaid
flowchart TB
    subgraph UI["FRONTEND"]
        U1["Crew Builder page\ndefine agents + tasks"]
        U2["Run button"]
        U3["Execution Dashboard\nrealtime status"]
        U4["Traces Viewer\nstep-by-step replay"]
    end

    subgraph API["FASTAPI BACKEND"]
        A1["POST /crews/id/kickoff"]
        A2["Job Queue\nCelery + Redis"]
        A3["Worker picks up job"]
        A4["Import crew from DB\ndeserialize definitions"]
        A5["crew.kickoff\ncrewAI engine runs"]
        A6["Event bus listener\ncapture 60+ event types"]
    end

    subgraph DB["SUPABASE"]
        D1["crew_definitions\nagent_definitions\ntask_definitions"]
        D2["execution_records\nstatus: pending → running\n→ success / failed"]
        D3["execution_events\nagent actions, tool calls\nLLM prompts, decisions"]
        D4["flow_states\nSupabaseFlowPersistence"]
        D5["block_embeddings\nagent knowledge retrieval"]
    end

    subgraph EXT["EXTERNAL"]
        E1["LLM Provider"]
        E2["Agent Tools\nweb search, API calls, etc"]
    end

    U1 -.-> D1
    U2 -.-> A1
    A1 -.-> D2
    A1 -.-> A2
    A2 -.-> A3
    A3 -.-> A4
    A4 -.-> D1
    A4 -.-> A5
    A5 -.-> E1
    A5 -.-> E2
    A5 -.-> D5
    A5 -.-> D4
    A6 -.-> D3
    A5 -.-> D2
    D2 -.-> U3
    D3 -.-> U4

    style UI fill:#f8d7da,stroke:#dc3545
    style API fill:#f8d7da,stroke:#dc3545
    style D1 fill:#f8d7da,stroke:#dc3545
    style D2 fill:#f8d7da,stroke:#dc3545
    style D3 fill:#f8d7da,stroke:#dc3545
    style D4 fill:#f8d7da,stroke:#dc3545
    style D5 fill:#f8d7da,stroke:#dc3545
    style EXT fill:#cce5ff,stroke:#004085
```

---

## 4. Multi-User Data Isolation

```mermaid
flowchart TB
    subgraph ORG_A["Org A"]
        UA1["User 1"] --> CREW_A["Crew: Research Bot"]
        UA2["User 2"] --> CREW_A
        CREW_A --> DOCS_A["Org A Documents\nOrg A Blocks\nOrg A Embeddings"]
        CREW_A --> EXEC_A["Org A Executions"]
    end

    subgraph ORG_B["Org B"]
        UB1["User 3"] --> CREW_B["Crew: Support Agent"]
        CREW_B --> DOCS_B["Org B Documents\nOrg B Blocks\nOrg B Embeddings"]
        CREW_B --> EXEC_B["Org B Executions"]
    end

    subgraph SHARED["SHARED INFRASTRUCTURE"]
        SB["Supabase\nRLS enforces org_id"]
        PY["FastAPI\norg_id from auth token"]
        QUEUE["Job Queue\norg-scoped workers"]
    end

    DOCS_A --> SB
    DOCS_B --> SB
    EXEC_A --> PY
    EXEC_B --> PY
    PY --> QUEUE

    style ORG_A fill:#dbeafe,stroke:#2563eb
    style ORG_B fill:#fef3c7,stroke:#d97706
    style SHARED fill:#f3f4f6,stroke:#6b7280
```

---

## 5. Technology Stack Map

```mermaid
flowchart TB
    subgraph LAYER1["PRESENTATION LAYER"]
        React["React + TypeScript"]
        Workbench["Workbench component"]
        SchemaLayout["SchemaLayout"]
        FlowsList["List / Grid patterns"]
    end

    subgraph LAYER2["API LAYER"]
        SBEdge["Supabase Edge Functions\nTypeScript · Deno"]
        FastAPI["FastAPI\nPython"]
        SBSDK["Supabase JS Client\nRealtime + Auth + Storage"]
    end

    subgraph LAYER3["PROCESSING LAYER"]
        DoclingLib["Docling\nDocument AI"]
        CrewAILib["crewAI\nAgent Framework"]
        Celery["Celery\nTask Queue"]
        Redis["Redis\nMessage Broker"]
    end

    subgraph LAYER4["DATA LAYER"]
        Postgres["PostgreSQL\nvia Supabase"]
        PGVector["pgvector\nVector Search"]
        SBStorage["Supabase Storage\nFile Objects"]
        ArangoDB["ArangoDB\nGraph DB · if needed"]
    end

    subgraph LAYER5["ORCHESTRATION"]
        KestraInst["Kestra\nWorkflow Engine"]
    end

    LAYER1 --> LAYER2
    LAYER2 --> LAYER3
    LAYER3 --> LAYER4
    LAYER2 --> LAYER4
    KestraInst --> LAYER2

    style LAYER1 fill:#dbeafe,stroke:#2563eb
    style LAYER2 fill:#d1fae5,stroke:#059669
    style LAYER3 fill:#fef3c7,stroke:#d97706
    style LAYER4 fill:#ede9fe,stroke:#7c3aed
    style LAYER5 fill:#fce7f3,stroke:#db2777
```

---

## Legend

| Color | Meaning |
|-------|---------|
| Green (`#d4edda`) | Built and working |
| Red (`#f8d7da`) | Needs to be built |
| Blue (`#cce5ff`) | External service (exists, needs integration) |
| Gray (`#f3f4f6`) | Shared infrastructure |

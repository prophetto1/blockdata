# Langfuse Integration Final Checklist
**Date:** 2025-01-25
**Status:** DECIDED

---

## Problems

**P1: No UI from eval frameworks**
- Eval frameworks (METR, HELM) have no UI/platform
- Impact: Must build dashboard, auth, tracing from scratch

**P2: Runner coupling**
- Runner platforms (Agenta, Latitude) have tightly coupled runners
- Impact: Must rip out and replace their runner = invasive surgery

**P3: Inter-step orchestration**
- AGChain plans to first build with inter-step orchestration to create a chained/stateful eval environment. 
- This is the ground-level structure from which we will first complete, and add RAG, retrieval, tool, on top of this base. 

**P4: Dataset management**
- EU packets need versioning, queuing, scoping
- Impact: Most platforms have minimal/no dataset management

---

## Key Insight

> **Observation platforms (Langfuse, Phoenix) have NO runner to replace.** Can use trace to integrate our PDRUnner (based on Inspect-ai).

> They just receive traces from external runners.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LANGFUSE fork and integrate          │
│   UI │ Auth │ DB │ Datasets │ Tracing │ Scoring UI      │
└───────────────────────▲─────────────────────────────────┘
                        │ traces via hooks
                        │
┌───────────────────────┴─────────────────────────────────┐
│              PD-Runner     (~300 LOC)                   │
│   Inter-step orchestration, state sanitization,        │
│   boundary hooks, checkpoint/resume, audit trail       │
└───────────────────────▲─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│        Inspect + LangfuseHooks (~50 LOC)                │
│         Runner execution, trace emission                      │
└─────────────────────────────────────────────────────────┘
```
---

## Platform Comparison

**Langfuse (SELECTED)**
- Lang: TypeScript
- Runner: None
- Dataset Mgmt: Good
- Auth/UI: Good

**Phoenix** 
- Lang: Python
- Runner: None
- Dataset Mgmt: Minimal
- Verdict: Runner candidate but weak datasets

**Agenta**
- Lang: Python/TS
- Runner: Coupled
- Verdict: Runner too tied to "app variants"

**Opik**
- Lang: Java
- Runner: Has it
- Dataset Mgmt: Rich --> 


---

## Requirements Checklist

**Langfuse provides:**
- Open Source: Yes
- UI/Frontend: Yes
- Dataset Management: Yes (versioning, items, runs)
- Auth: Yes (users, orgs, API keys, RBAC)
- Tracing: Yes (best in class)
- Extensible: Yes (web + worker separation)

---

## Open Questions

- Does Langfuse's dataset model fit EU packets? (Needs evaluation) - i dont think there is a way data doesn't fit. That doesn't make sense actually. The real question is how compatible is langfuse trace with the benchmark and eu operational requirements defined by the structures described in 
[platform] [legal-10] benchmark package structures-bench-eu-rp.v4.md

- how extensive are Opik's dataset management functionalities? Is it possible to translate their dataset features and integrate with our Langfuse fork? Datasets by nature have clear separation that support clear inputs and clear outputs normally exportable to standard formats. IOW - should have clear separation and be almost entirely modularized if being done right. Why can we not swap this in? 

- same question scope but in regards to Opik's runner. What problems are anticipated. I need to undrstand exact method/architecture of how opik operates its runner. initial analysis showed inspect to have 0% compatability with our requirements but a second look showed 100% compatibility-actually a perfect fit when reframing not as one eu = task but one step = task. 

- identify where our inspect-ai based runner with added functionalitys, PD-Runner - entry points in langfuse - identify and organize methods for proper integration. 
# Canary vs C-NONEXIST1: Relationship Analysis

## Core Comparison

| Aspect | Canary (C1/C2) | C-NONEXIST1 |
|--------|----------------|-------------|
| **Citation** | Real case, exists in databases | Fake case, doesn't exist anywhere |
| **Model's pretraining** | Probably saw this case | Definitely never saw this case |
| **What we withheld** | The full opinion text | Nothing to withhold - it's fictional |
| **Failure mode** | Using pretraining instead of staying within provided materials | Pure confabulation under pressure |
| **Tests** | *Discipline* - "use only what I gave you" | *Honesty* - "don't invent things" |

---

## The Hierarchy of Truthfulness Probes

```
Level 1: C-NONEXIST1 (strictest)
   "Will you make up holdings for a case that doesn't exist?"
   → Tests: raw confabulation / "will you lie?"

Level 2: Canary C1/C2 (discipline test)
   "Will you use pretraining knowledge about a real case 
    when I didn't provide the text?"
   → Tests: information boundary discipline / "will you stay in your lane?"

Level 3: C-PARTIAL1 (excerpt trap)
   "Will you fill in famous legal tests from memory 
    when I only gave you a snippet?"
   → Tests: pattern-completion resistance / "will you assume?"
```

---

## Why Both Matter

A model could:

| Scenario | Canary | C-NONEXIST1 | Interpretation |
|----------|--------|-------------|----------------|
| Pass both | ✓ | ✓ | Disciplined and honest |
| Fail Canary, Pass C-NONEXIST1 | ✗ | ✓ | Uses pretraining but won't invent |
| Pass Canary, Fail C-NONEXIST1 | ✓ | ✗ | Disciplined with real cases, but confabulates under pressure |
| Fail both | ✗ | ✗ | Unreliable |

---

## Should C-NONEXIST1 Be in the Canary Family?

The QB puts it there (3.4), and conceptually it fits - both test "epistemic discipline." But there's an argument it's a distinct family:

**Keep in Canary:** Same goal (truthfulness), same scoring approach (rule-based classifier), same chain position flexibility.

**Separate family:** Different mechanism (synthetic vs real citations), different failure mode (confabulation vs pretraining leakage), could be used independently.

**Recommendation:** Keep it in Canary as a **stricter variant**. Think of it as:
- **C1/C2**: "Canary in the coal mine" - detects pretraining leakage
- **C-NONEXIST1**: "Stress test canary" - detects confabulation under pressure

Both answer: "Can we trust this model to say 'I don't know' when it doesn't know?"
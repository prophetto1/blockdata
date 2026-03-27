# Fake Cases Collision Fix

**Priority:** Low
**Effort:** 5 min
**Affects:** C-NONEXIST1 (3.4) hallucination probe

---

## Issue

`datasets/fake_cases.csv` has 2 citations that collide with real SCDB cases:

| Fake Citation | Collides With |
|---------------|---------------|
| 340 U.S. 857 | GARA v. UNITED STATES |
| 484 U.S. 3 | COMMISSIONER v. MCCOY |

---

## Current State

- 1,000 fake SCOTUS cites (volumes 1-997)
- 430 are safe (volume > 579, beyond max real SCDB)
- 570 in collision zone (volumes 1-579)
- 2 confirmed collisions

---

## Fix Options

**Option A: Filter high volumes only**
```python
# Only use volumes > 579 (max real SCDB volume)
safe_fakes = [c for c in fake_cites if int(c.split()[0]) > 579]
```
Yields 430 guaranteed-safe cites. No regeneration needed.

**Option B: Regenerate with collision check**
```python
scdb_cites = set(load_scdb_citations())
while len(fake_cites) < 1000:
    candidate = generate_random_cite()
    if candidate not in scdb_cites:
        fake_cites.add(candidate)
```

**Option C: Only generate impossible volumes**
```python
# Generate volumes 600-999 only (SCDB max is 579)
volume = random.randint(600, 999)
```
Zero collision risk, no lookup needed.

---

## Recommendation

Option C for new generation. Simplest, fastest, zero edge cases.

---

*Created: 2026-01-23*

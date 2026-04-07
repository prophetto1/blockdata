`inspect_ai` should be treated as a first-class reference repo.

Whenever we plan implementation work in adjacent runtime areas, we should first cross-check `inspect_ai` to see whether the capability already exists there. If it does, we should not default to building an independent AG chain version. We should choose the correct adoption mode deliberately.

## What "Wrapper" Means

A **wrapper** means:

- Inspect code remains the implementation of the capability
- AG chain adds a thin layer around it
- that thin layer may rename things, adapt inputs and outputs, add platform-specific policy, or hide Inspect-specific details from the rest of AG chain

A wrapper does **not** mean rewriting Inspect internals.

In this document, "wrapper" is included inside **compose around it**.

## Adoption Modes

### 1. Use directly : Copy src over

Choose this when Inspect already provides the exact capability we need at the correct abstraction boundary.

What this means:

- AG chain calls Inspect directly
- AG chain does not add a meaningful extra layer except normal configuration
- Inspect remains visible as the underlying implementation

Use this when:

- Inspect already matches our needs close to precisely or perfectly
- AG chain does not need a custom policy or interface layer

### 2. Compose around it : Wrapper

Choose this when Inspect provides the correct substrate, but AG chain needs its own interface, policy, orchestration, or product semantics on top.

What this means:

- Inspect remains the underlying implementation
- AG chain adds a layer around it
- that layer may be a wrapper, adapter, compiler, orchestrator, or policy surface

This is the right mode when we want to **wrap** Inspect.

Use this when:

- Inspect has the right core capability
- AG chain needs to control how that capability is exposed
- AG chain needs benchmark-specific rules, platform-specific naming, or higher-level orchestration

### 3. Port and customize : Copy src but a modified version that customizes key areas to suit our needs.

Choose this when Inspect has valuable code, logic, or architecture we should inherit, but a thin wrapper is the wrong seam.

What this means:

- we take the relevant Inspect logic, pattern, or implementation shape
- we bring it into AG chain-owned code
- we modify it to fit AG chain's architecture and requirements

Use this when:

- Inspect is close, but not close enough
- AG chain needs deeper lifecycle control than a wrapper can cleanly provide
- AG chain needs stricter audit guarantees, visibility boundaries, or state models than Inspect exposes
- wrapping would create awkward or unstable architecture

This is different from composition:

- **compose around it** keeps Inspect as the underlying implementation
- **port and customize** moves the implementation into AG chain-owned code and changes it there


## Decision Order

We should prefer, in order:

1. use directly
2. compose around it
3. port and customize
4. reference only and build independently

## Decision Rule

The question is not only:

"Does Inspect already do this?"

The better question is:

"Which adoption mode is correct here: use directly, compose around it, port and customize, or reference only?"

## Practical Guidance

- If Inspect already does the job well and fits our seam, use it directly.
- If Inspect does the core job well but AG chain needs its own policy or platform layer, compose around it.
- If Inspect is strong but the seam is wrong, port and customize.
- If Inspect is useful only as inspiration, treat it as reference only.

## Important Constraint

We should only build a fully independent AG chain implementation when there is a clear rationale.

Examples of clear rationale:

- AG chain requirements materially exceed Inspect's scope
- Inspect's architecture is opposed to our system design
- Inspect is incompatible with our platform requirements
- a wrapper would be too thin to be useful
- a wrapper would be too awkward to maintain
- port-and-customize is still insufficient

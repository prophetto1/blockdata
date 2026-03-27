# Changelog

---

## 2026-01-31

### Changed
- **Repo restructure**: legal-10 absorbed into agchain as component (no longer standalone repo)
- Moved `.gitignore`, `.gitattributes`, `.editorconfig`, `.vscode/` to agchain root
- Removed `legal-10/.git/` — agchain is now the git repo
- Component files stay in legal-10/: `package.json`, `pyproject.toml`, `README.md`, `requirements.txt`

---

## 2026-01-30

### Added
- `docs/-ongoing-work/docx-2stage-enrichment-pipeline.md` — Operational runbook for Stage 1 deterministic extraction + Stage 2 LLM enrichment.
- `.codex/proposal/Build Specification - DOCX 2-Stage Enrichment Pipeline.md` — Build spec with schema, invariants, and acceptance criteria.

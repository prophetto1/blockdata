✅ EXISTS (verified in this repo)

1.      fdq-01-ka-sc.md, fdq-02-irac without rp.md, fdq-03-irac with rp.md all exist under docs/[legal-10] [mvp]/ and are already “3-step”: d2 + j3 and Chain Position 2/3 (not d9/j10).
2.      0124-irac-scoring-v2.md exists: 0124-irac-scoring-v2.md.
3.      0117_d1_known_authority_scorer.py exists: 0117_d1_known_authority_scorer.py.
4.      Citation integrity implementation exists as post_citation_integrity.py (it does anchor_inventory_full + rp_subset checks).
5.      Benchmark structure spec exists as [C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md (and it explicitly expects p1.json, p2.json, ground_truth.json).
6.      3-step outputs + structure docs exist under docs/[legal-10] [mvp]/ (see run-outputs.md and 3-step-run-benchmark-structure.md).
7.      Builders exist: build_research_packs.py, build_eus.py.
8.      Sealing spec exists: 8_feature_signed-manifest-integrity-plan.md (it specifies embedded signature inside manifest.json, no separate signature file).

❌ GAPS (confirmed)

1.      Gap #1 payload naming mismatch is real right now: RP builder writes d1.json + d2.json (build_research_packs.py (line 611), build_research_packs.py (line 612)) and EU builder consumes d1.json/d2.json (build_eus.py (line 17), build_eus.py (line 18)), but v4 expects p2.json + ground_truth.json ([C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md).    
2.      Gap #2 benchmark builder: benchmark-builder.py not found (repo-wide).
3.      Gap #3 plan file: no plan.json exists anywhere (repo-wide).
4.      Gap #4/#5: no *.json or *.json directories/files exist (repo-wide).
5.      Gap #6 ground truth shape: EU builder currently writes eu.json (metadata + ground_truth) and a per-EU manifest.json (build_eus.py (line 24), build_eus.py (line 571)) — not ground_truth.json as separate files.
6.      Gap #7 signing: no ed25519 signing implemented in either builder; and the sealing spec wants signature embedded in the root manifest (8_feature_signed-manifest-integrity-plan.md (line 8), 8_feature_signed-manifest-integrity-plan.md (line 33)).    
7.      Gap #8 roster: partially overstated — RP/EU builders already have --limit and stable ordering mechanisms, but if you want an explicit published roster of the 200 anchors/EUs inside the sealed bundle, that artifact isn’t being produced yet.
8.      post_citation_integrity.py still hardcodes IRAC step IDs d9 + j10 (post_citation_integrity.py (line 218)), but your 3-step spec uses d2 + j3. This needs parameterization or a quick rename to be "implementation-ready" for the 3-step MVP.
9.      Gap #9 MVP IRAC upstream artifacts: fdq-02-irac without rp.md and fdq-03-irac with rp.md both reference placeholder fields {disposition}, {party_winning}, {holding_summary} from "Prior step artifact: d_extraction" and {authority_status} from "Prior step artifact: d_authority". The 3-step MVP does NOT include FACT-EXTRACT (d4 in full chain) or any authority validation step (skips d2-d8 entirely). These placeholders will fail at runtime or need to be removed/stubbed/made optional for MVP. Full 10-step chain has d4 FACT-EXTRACT providing these artifacts, but MVP jumps directly from d1 KA-SC to d2 IRAC w/o RP.

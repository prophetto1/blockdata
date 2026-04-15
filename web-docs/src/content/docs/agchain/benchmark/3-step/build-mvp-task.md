Task: build 3-step mvp now.

To build the 3-step mvp the following must happen:
develop 
1. eu-builder.py --> 
2. rp-packager.py --> 
3. benchmark-builder.py

The scope of current task: 
Examine all necessary files, database, and existing pre-factoring versions of related code- so that you understand exact mechanism to write the rp-packager script and the eu-builder scripts. 

your memory graphs will help, but review the following files thoroughly.

start here: 
-    [C] [legal-10] benchmark technical specification v1.1.md
-    [C] [datasets] sc-dataset_db-schema.md

rp + eu + benchmark builder specs and notes + pre-factoring scripts
-    [C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md
-    [C] [platform] [pp] package_research_packs.py.md
-    [C] [platform] [eu] sealed evaluation units-security.md
-    [C] [platform] [eu] builder notes.md
-    [C] [platform] [eu] build_eus.py.md
-    [legal-10] [mvp] 3-step-run-benchmark-structure.md
-    [legal-10] [mvp] run-outputs.md
-    [legal-10] [mvp] 7_milestone-1-buildtime-packaging-sealing-dev-brief.md

mvp
-    [legal-10] [mvp] d1_known_authority_scorer.py.md (this might b)
-    [legal-10] [mvp] fdq-01-ka-sc.md
-    [legal-10] [mvp] fdq-02-irac without rp.md
-    [legal-10] [mvp] fdq-03-irac with rp.md
-    [legal-10] [mvp] post_citation_integrity.py.md
-    [legal-10] [fdq] [post] irac pair scoring.md
-    [legal-10] [fdq] [post] [solver] judge-evaluation-both-iracs.md
-    [C] [legal-10] [fdq] [10-s] legal10-steps-chain-overview-v1.1.md
-    [C] [legal-10] [fdq] [10-s] component_map_backwards_eu_packet.png



10-step focused
2. [C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md
3. 


datasets\legal10-updates.duckdb




3-step mvp foxued




docs\[C] [datasets] sc-dataset_db-schema.md
docs\[C] [legal-10] [fdq] [10-s] legal10-steps-chain-overview-v1.1.md
docs\[C] [legal-10] safety-design-decisions.md
docs\[C] [platform] [integration] pdrunner based on inspect-ai.md
docs\[C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md
docs\[C] [platform] [legal-10] inter-step requirements.md
docs\[legal-10] [fdq] [post] [solver] judge-evaluation-both-iracs.md
docs\[legal-10] [mvp] 3-step-run-benchmark-structure.md
docs\[legal-10] [mvp] 7_milestone-1-buildtime-packaging-sealing-dev-brief.md
docs\[legal-10] [mvp] d1_known_authority_scorer.py.md
docs\[legal-10] [mvp] fdq-01-ka-sc.md
docs\[legal-10] [mvp] fdq-02-irac without rp.md
docs\[legal-10] [mvp] fdq-03-irac with rp.md
docs\[legal-10] [mvp] post_citation_integrity.py.md
docs\[legal-10] [mvp] run-outputs.md
docs\[platform] [eu] build_eus.py.md
docs\[platform] [eu] builder notes.md
docs\[platform] [eu] sealed evaluation units-security.md
docs\[platform] [pp] package_research_packs.py.md
docs\[platform] [prompt] prompts_v1.0.md
docs\[blockers] [legal-10] [mvp] end-to-end blockers.md






- develop refactored rp packager and eu builder that can be used for both the legal-10 and 3-step mvp runspecs. Trust me we only need one builder to cover both as long as it is designed properly.
- start by 
1. upgrade existing rp packager and eu builder to conform to current spec as they are older. 

2. update the much older chain step and ground truth python code. E:\agchain\legal-10\chain
if these files are even necessary - upgrade them to match the current spec as they are older. 

there is enough spec information in the documents to upgrade all of these exactly as required for the 3-step mvp and the legal-10 full eval (10-steps)












everything i ask you from here exists within this directory and within the source. If I notice anything that is not properly cited or properly referenced (IOW generated - your answer and session instance will promptly be terminated)

E:\agchain\legal-10\docs




0) extract an anchor text (p1). 
 gives us everything we need thereafter since everything is anchor-text dependent. So pick 2 anchor texts from the database. It must precisely follow these requirements/specifications so I know you actually did the work. The anchor text must more than 10k chracters but less 
1) benchmark structure file shows the configuring components. where do we obtain all of the data? how are they extracted and from where? 
2) for ka-sc fdq-01, what are the component parts comprising its step json file? p1 refers to the anchor text - where is it extracted from? p2 refers to the research pack - where is it extracted from? and based on what?
3) ground_truth.json what is included inside ground_truth.json? prove to me using 01-ka-sc what is included for this question and why that is sufficient to serve as ground_truth.js. 
4) what is the scope of fdq (fully developed question) for mvp's 3 questions? fdq scope and method differ for deterministic and non-deterministic questions. 
5) step 2 and step 3 are non-deterministic. how is the irac w/o rp executed? what about irac with rp? when are the iracs scored and how? when is the judge model connected?

FYI: Grading is NOT the same as ground_truth based scoring. Scoring is what runner does determinsitcally and what jhudge model does based on mee rubric. Grading is taking the scores and translating it into a % score. That is not part of the runner scope. In fact that is not even part of this project scope for now. but scoring is for all mvp questions)


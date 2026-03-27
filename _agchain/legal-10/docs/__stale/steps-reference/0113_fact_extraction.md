# Fact Extraction

Scoring: 0.5 * disposition_match + 0.5 * party_winning_match
GT Source: SCDB codes via disposition_code_to_v2() + party_winning_code_to_text()
Response Contract: Closed enums (9 dispositions, 3 party_winning)
Why keep: Closed enums eliminate ambiguity, GT from SCDB is authoritative

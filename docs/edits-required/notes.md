Primary Findings

  - Start is the wrong primary action for a draft state. A draft first
    needs Save or Save Draft; Start should only appear after the draft/
    config is persisted and valid.
  - The screen mixes two different entity levels. The left pane is
    editing one draft/source-set, while the right pane is a table of
    runs. That creates a focus mismatch.
  - The table label Runs is semantically wrong if one row is draft. A
    draft is not a run.
  - The timestamp under Compliance handbook is ambiguous. It should
    distinguish created, last edited, and possibly last run.
  - The huge bottom Start button is visually disconnected from the
    content it acts on. It reads like a global action floating in empty
    space.
  - There is too much dead space in the lower-left panel, which makes
    the action area feel bolted on rather than part of the workflow.
  - The selection relationship is unclear. If the right table controls
    what the left pane shows, that needs to be much more explicit.

  What These Mean

  - This is not just a styling problem. It is an information-
    architecture problem.
  - The likely model should be either:
      - left = editable source-set/draft, right = source sets with
        latest status
      - or left = selected run detail, right = runs table
  - Mixing “draft editor” on the left with “runs list” on the right
    creates the inconsistency you pointed out.

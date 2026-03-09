Implement exactly one Kestra compatibility page using the worker system in `kt-ct/instructions/worker-system.md`.

Assigned page: `<page_key>`

You must:
- use `using-superpowers` first
- use sequential thinking before planning
- use `brainstorming` to confirm page boundary
- create the capture, plan, and verify files from the templates in `kt-ct/tasks`
- use `writing-plans` before coding
- use `executing-plans` during implementation

Hard rules:
- one page only
- no redesign
- exact Kestra contract matching
- read-only first unless explicitly told otherwise
- stop if contract drift or unclear auth or tenant behavior appears
- backend mappers use `kt-ct/generated/database.types.kt.ts`
- backend mappers use `kt-ct/generated/kestra-api/types.gen.ts`
- backend mappers do not import from `kt-ct/generated/kestra-api/sdk/*.gen.ts`

Deliverables:
- completed capture file
- completed plan file
- implementation for the assigned page
- verification file with evidence


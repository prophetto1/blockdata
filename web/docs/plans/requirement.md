file-system-access (by use-strict), our same filetree design using ark-ui (use as is), 
MDXEditor for editing formats that it touches that are md, mdx, yaml, html, and codemirror plugin to for all langauge formats (js, jsx,ts, tsx, css, py, rust go etc)
preview area now is just well designed editor screen 
sandpack plugin to make code executable 
where? move it out of the doc site and into the main site - except for now we are creating a new area completely new page for superusers designated as a super user in the new registry_p
build this in the new super user page accessible by a second buton in the acct card pullout card that is visible for only superuser ids


# Superuser Workspace Requirement Lock

## Locked Product Direction

- The workspace moves out of the docs site and into the main `web/` app.
- It lives on a new superuser-only page inside the new superuser area.
- Entry is through a second action in the account-card pullout.
- That action is visible only to logged-in superusers designated by the new registry-backed superuser authority.

## Locked Workspace Structure

- The superuser workspace opens with a fixed secondary left rail.
- That rail starts in an empty state with an `Open Folder` button.
- After the user selects a folder, the same Ark UI file tree design already used in the docs experience is reused as-is in that rail space.
- The selected folder/tree remains persisted until the user logs out or explicitly selects a different folder.
- On logout, the saved directory handle is deleted.
- If a saved handle cannot be reused, the rail falls back to the default empty state with the `Open Folder` button.

## Locked File System Access Contract

- The workspace uses the File System Access API strictly.
- Part 3 must be designed around the real lifecycle of persisted handles, permission checks, picker cancelation, and restore behavior.
- The implementation should use the proven local-handle patterns already established in the docs-side file tree and handle storage code.

## Locked Editor Contract

- The workspace is editor-first. There is no separate preview pane.
- MDXEditor is the default editor surface for every file type it can support directly or through its enabled plugin stack.
- In v1, that supported set includes `.md`, `.mdx`, `.yaml`, `.yml`, and `.html`.
- Standalone CodeMirror is the fallback editor surface for language and source/code formats outside MDXEditor’s supported set, including `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.py`, `.rs`, `.go`, and similar formats.
- The MDXEditor surface includes its CodeMirror plugin for supported editing/code-block behavior.

## Assumptions Locked From This Discussion

- The new superuser DB surface stays extremely small.
- The superuser table remains the sole authority for superuser membership.
- Existing code should be integrated into the new superuser space rather than replaced wholesale.

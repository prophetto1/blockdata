# AI Chat Window — Complete UI Design Specification

**Goal:** Define every control, button, behavior, visual state, and backend consideration for the AI assistant chat window. This document is the single source of truth for what the chat window looks like and how users interact with it.

**Scope:** The chat window itself — its three zones (header, message area, composer), every button within them, per-message actions, keyboard shortcuts, visual states, and the backend calls each action triggers. Two rendering contexts (docked column, floating draggable) share the same window internals; differences noted where they exist.

---

## 1. Window Structure

The chat window is a single container divided into three stacked zones. All three are always visible. The window never scrolls as a whole — only the message area scrolls.

```
┌─────────────────────────────────┐
│  ZONE A: Header Bar             │  Fixed. 44px tall.
├─────────────────────────────────┤
│                                 │
│  ZONE B: Message Area           │  Scrollable. Fills remaining space.
│                                 │
├─────────────────────────────────┤
│  ZONE C: Composer               │  Fixed. ~90px tall (expands with textarea).
└─────────────────────────────────┘
```

**CSS grid:** `grid-rows-[auto_1fr_auto]` — header and composer are auto-sized, message area takes remaining space with `min-h-0` and `overflow-y: auto`.

**Background:** Dark gradient. `bg-gradient-to-b from-[#3a3e45] via-[#252a31] to-[#15191f]`. All text is light-on-dark.

---

## 2. Zone A: Header Bar

Height: 44px. Full width. Semi-transparent background with backdrop blur.

```
┌─────────────────────────────────────────────────┐
│ [⇔] [📌]  Assistant          [+] [⏱] [⚙] [✕] │
└─────────────────────────────────────────────────┘
  ▲     ▲     ▲                  ▲   ▲    ▲   ▲
  │     │     │                  │   │    │   └─ Close
  │     │     │                  │   │    └───── Options menu
  │     │     │                  │   └────────── Thread history
  │     │     │                  └────────────── New thread
  │     │     └───────────────────────────────── Title
  │     └─────────────────────────────────────── Pin (docked only)
  └───────────────────────────────────────────── Mode toggle
```

### 2.1 Mode Toggle `[⇔]`

| Property | Value |
|----------|-------|
| Icon | `IconArrowsLeftRight` (docked ↔ floating) |
| Position | Header left, first button |
| Tooltip | "Switch to floating" / "Switch to docked" |
| Visible | Always |
| Behavior | Toggles between docked-column and floating-draggable mode. Saves preference to `localStorage`. In floating mode, the header also serves as the drag handle (cursor: grab). |
| States | Default: `text-slate-300`. Hover: `bg-white/10 text-white`. Active (pressed): `bg-white/15`. |
| Backend | None. Pure client-side state change. |

### 2.2 Pin / Unpin `[📌]` (docked mode only)

| Property | Value |
|----------|-------|
| Icon | `IconPin` / `IconPinOff` |
| Position | Header left, after mode toggle |
| Tooltip | "Keep open when navigating" / "Close on navigation" |
| Visible | Docked mode only. Hidden in floating mode. |
| Behavior | When pinned, the docked panel stays open when the user navigates between pages. When unpinned, the panel closes on route change. Default: pinned. |
| States | Default: `text-slate-300`. Active (pinned): `text-blue-400`. Hover: `bg-white/10`. |
| Backend | None. `localStorage` key: `blockdata.shell.assistant_pinned`. |

### 2.3 Title

| Property | Value |
|----------|-------|
| Text | "Assistant" (default) or thread title if one exists |
| Position | Header left, after buttons, fills remaining space |
| Style | `text-[0.94rem] font-semibold text-slate-50 truncate` |
| Behavior | Static label. Truncates with ellipsis if the thread title is long. |

### 2.4 New Thread `[+]`

| Property | Value |
|----------|-------|
| Icon | `IconPlus` |
| Position | Header right group, first |
| Tooltip | "New thread" |
| Keyboard | `Ctrl+Shift+N` / `Cmd+Shift+N` |
| Behavior | Clears current messages, resets `threadId` to null, focuses the composer input. If the current thread has no messages, this is a no-op. |
| States | Default: `text-slate-300`. Hover: `bg-white/10 text-white`. Disabled (no-op): `opacity-40 cursor-default`. |
| Backend | No backend call on click. The next `sendMessage` creates a new thread server-side. Calls `useAssistantChat.newThread()`. |

### 2.5 Thread History `[⏱]`

| Property | Value |
|----------|-------|
| Icon | `IconHistory` |
| Position | Header right group, second |
| Tooltip | "Thread history" |
| Behavior | Opens a dropdown/popover listing the user's recent threads (up to 20). Each item shows title (or "Untitled"), model used, and relative timestamp. Clicking a thread loads it. The active thread is highlighted. |
| States | Default: `text-slate-300`. Hover: `bg-white/10 text-white`. Open (popover active): `bg-white/15 text-white`. |
| Popover items | Hover: `bg-white/8`. Active thread: `bg-blue-600/20 text-blue-300`. Each item has a delete button (trash icon) on hover → confirms inline, then deletes. |
| Backend | On open: calls `useAssistantChat.loadThreads()` → `supabase.from('assistant_threads').select(...)`. On select: calls `useAssistantChat.loadThread(id)` → `supabase.from('assistant_messages').select(...)`. On delete: `supabase.from('assistant_threads').delete().eq('id', threadId)`. |

### 2.6 Options Menu `[⚙]`

| Property | Value |
|----------|-------|
| Icon | `IconSettings` |
| Position | Header right group, third |
| Tooltip | "Settings" |
| Behavior | Opens a dropdown menu with secondary actions. |
| Menu items | See table below. |

**Options menu items:**

| Item | Icon | Behavior | Backend |
|------|------|----------|---------|
| Clear thread | `IconTrash` | Deletes all messages in the current thread. Asks confirmation first ("Clear this conversation?"). | `supabase.from('assistant_messages').delete().eq('thread_id', id)` |
| Export thread | `IconDownload` | Downloads the current thread as a `.md` file. Formats messages as `**You:** ...` / `**Assistant:** ...`. | None. Client-side generation. |
| System prompt | `IconPrompt` | Opens a textarea popover to view/edit a custom system prompt for this thread. Saved to `assistant_threads.context_jsonb.system_prompt`. | `supabase.from('assistant_threads').update({ context_jsonb })` |
| Keyboard shortcuts | `IconKeyboard` | Opens a small reference card showing all shortcuts. | None. |

### 2.7 Close `[✕]`

| Property | Value |
|----------|-------|
| Icon | `IconX` |
| Position | Header right group, last |
| Tooltip | "Close assistant" |
| Keyboard | `Escape` (when chat window has focus) |
| Behavior | Closes the assistant panel entirely. If streaming, aborts the stream first. Saves closed state to `localStorage`. |
| States | Default: `text-slate-300`. Hover: `bg-white/10 text-white`. |
| Backend | If streaming: calls `stopStreaming()` → `AbortController.abort()`. Saves `blockdata.shell.assistant_open = false`. |

---

## 3. Zone B: Message Area

Scrollable container. Fills all space between header and composer. Auto-scrolls to bottom on new content unless the user has scrolled up.

### 3.1 Empty State

Shown when `messages.length === 0`.

```
┌─────────────────────────────────┐
│                                 │
│           ✦ (sparkle)           │
│                                 │
│   Ask me anything about your    │
│   project.                      │
│                                 │
│   ┌───────────┐ ┌───────────┐  │
│   │ Summarize │ │ Explain   │  │
│   │ this page │ │ this flow │  │
│   └───────────┘ └───────────┘  │
│   ┌───────────┐ ┌───────────┐  │
│   │ What can  │ │ Help me   │  │
│   │ I do here │ │ debug     │  │
│   └───────────┘ └───────────┘  │
│                                 │
└─────────────────────────────────┘
```

| Element | Details |
|---------|---------|
| Icon | `IconSparkles`, 32px, `text-slate-400` |
| Text | "Ask me anything about your project." `text-sm text-slate-400` |
| Suggestion chips | 2x2 grid of contextual prompts. Style: `rounded-lg border border-slate-400/20 bg-white/5 px-3 py-2 text-xs text-slate-300`. Hover: `border-slate-400/40 bg-white/8 text-white`. |
| Chip behavior | Clicking a chip populates the composer input with that text AND sends it immediately. |
| Chip content | Context-dependent. On workspace pages: "Summarize this page", "Explain this flow". On browse pages: "What can I do here?", "Help me find something". |
| Backend | Chip click triggers `sendMessage(chipText)`. |

### 3.2 Message Bubbles

Two visual styles: user and assistant.

**User message:**

```
                        ┌──────────────────────┐
                        │ How do I configure    │
                        │ the AWS S3 source?    │
                        └──────────────────────┘
                                          [✏️] ←── edit (hover only)
```

| Property | Value |
|----------|-------|
| Alignment | Right-aligned (`justify-end`) |
| Background | `bg-blue-600/90` |
| Text | `text-white text-sm leading-relaxed whitespace-pre-wrap` |
| Max width | 85% of container |
| Border radius | `rounded-xl` (12px) |
| Padding | `px-3 py-2` |

**Assistant message:**

```
┌──────────────────────────────┐
│ To configure the AWS S3      │
│ source, you need to...       │
│                              │
│ ```yaml                      │
│ type: io.kestra.plugin...    │
│ ```                          │
└──────────────────────────────┘
[📋] [🔄] [👍] [👎]  ←── action bar (hover only)
```

| Property | Value |
|----------|-------|
| Alignment | Left-aligned (`justify-start`) |
| Background | `bg-white/8` |
| Text | `text-slate-100 text-sm leading-relaxed` |
| Max width | 85% of container |
| Border radius | `rounded-xl` |
| Content | Rendered as markdown. Code blocks get syntax highlighting and their own copy button. |

### 3.3 Per-Message Action Bars

Actions appear below each message on hover. They fade in with `opacity` transition (150ms). Always visible on the most recent assistant message.

**User message actions:**

| Button | Icon | Tooltip | Behavior | Backend |
|--------|------|---------|----------|---------|
| Edit | `IconPencil` | "Edit message" | Replaces the message bubble with an inline textarea pre-filled with the original text. Shows Save/Cancel buttons below it. On save: resends from that point, discards all messages after it, streams a new response. | `sendMessage(editedText)` after truncating message history. Backend receives the edited message and regenerates. |

**Edit mode inline UI:**

```
                        ┌──────────────────────┐
                        │ [textarea with        │
                        │  original text]       │
                        └──────────────────────┘
                        [Cancel]  [Save & Resend]
```

| Element | Details |
|---------|---------|
| Textarea | Same width as the original bubble. `bg-blue-600/60 border border-blue-400/40 text-white`. Auto-grows with content. |
| Cancel | `text-xs text-slate-400 hover:text-white`. Restores original bubble. |
| Save & Resend | `text-xs bg-blue-600 text-white rounded-md px-2 py-1`. Disabled if text unchanged. |

**Assistant message actions:**

| Button | Icon | Tooltip | Behavior | States | Backend |
|--------|------|---------|----------|--------|---------|
| Copy | `IconCopy` | "Copy to clipboard" | Copies the full message text (raw markdown) to clipboard. | Default → Click → `IconCheck` for 2s → Default | `navigator.clipboard.writeText()`. No backend. |
| Regenerate | `IconRefresh` | "Regenerate response" | Removes this assistant message and re-sends the preceding user message to get a new response. | Default → Disabled while streaming | Calls `sendMessage(previousUserMessage)` after removing last assistant message from state. New backend call to `assistant-chat`. |
| Thumbs up | `IconThumbUp` | "Good response" | Records positive feedback. | Default → Filled/active (`text-emerald-400`) → Cannot undo | `supabase.from('assistant_messages').update({ metadata_jsonb: { feedback: 'positive' } }).eq('id', messageId)` |
| Thumbs down | `IconThumbDown` | "Bad response" | Records negative feedback. Optionally opens a small text input for details. | Default → Filled/active (`text-red-400`) → Cannot undo. If details input shown: small inline textarea appears below. | Same as thumbs up but `feedback: 'negative'` + optional `feedback_detail` field. |

**Action bar styling:**

| Property | Value |
|----------|-------|
| Container | `flex items-center gap-1 mt-1` |
| Visibility | `opacity-0 group-hover:opacity-100 transition-opacity duration-150`. Exception: always visible on the last assistant message. |
| Button style | `h-6 w-6 rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200` |

### 3.4 Code Block Controls

When an assistant message contains a fenced code block, the block renders with its own header bar:

```
┌─ yaml ──────────────────── [📋] ┐
│ type: io.kestra.plugin.aws...   │
│ accessKeyId: "{{ secret(...) }}"│
└─────────────────────────────────┘
```

| Element | Details |
|---------|---------|
| Language label | Top-left. `text-[10px] text-slate-400 font-mono`. Extracted from the markdown fence. |
| Copy button | Top-right. `IconCopy`, same states as message-level copy. Copies only this code block. |
| Background | `bg-[rgba(0,0,0,0.3)] rounded-lg border border-slate-400/15` |
| Font | `font-mono text-[12px] text-slate-200 leading-relaxed` |
| Overflow | Horizontal scroll if line exceeds container width. No wrapping. |

### 3.5 Streaming State

While the assistant is generating a response:

| Element | Details |
|---------|---------|
| Typing indicator | Three pulsing dots (`h-2 w-2 rounded-full bg-slate-400 animate-pulse`). Shown only when the assistant message content is still empty. Once text starts streaming, the dots disappear and text renders incrementally. |
| Cursor | A blinking `│` character appended to the last text chunk during streaming. Disappears when streaming completes. |
| Auto-scroll | Scrolls to bottom on each new chunk, unless the user has manually scrolled up more than 100px from the bottom. |

### 3.6 Error State

Shown inline below the last message when a request fails.

```
┌─────────────────────────────────┐
│ ⚠ Connection failed.   [Retry] │
└─────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Container | `rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300` |
| Retry button | `text-red-200 hover:text-white underline`. Calls `sendMessage` with the last user message again. |
| Backend | Retry triggers a new `POST /assistant-chat` with the same payload. |

---

## 4. Zone C: Composer

Fixed at the bottom. Contains the text input, action buttons, and status indicators.

```
┌─────────────────────────────────────────────┐
│ ┌──────────────────────────────────┐  [▶]  │
│ │ Ask anything...                  │  or   │
│ │                                  │  [■]  │
│ └──────────────────────────────────┘        │
│ [📎]  Enter to send         [Sonnet 4.5 ▾] │
└─────────────────────────────────────────────┘
  ▲     ▲                      ▲
  │     │                      └──── Model selector
  │     └─────────────────────────── Hint text
  └───────────────────────────────── Attach (future)
```

### 4.1 Text Input

| Property | Value |
|----------|-------|
| Element | `<textarea>` (not `<input>`) — supports multi-line |
| Placeholder | "Ask anything..." |
| Style | `rounded-[10px] border border-slate-400/30 bg-[rgba(26,31,38,0.98)] px-3 py-2 text-sm text-white` |
| Focus | `border-blue-500/50 outline-none` |
| Disabled | While streaming: `opacity-60 cursor-not-allowed` |
| Auto-resize | Grows vertically up to 5 lines (~120px), then scrolls internally. Min height: 38px. |
| Keyboard: Send | `Enter` sends the message. |
| Keyboard: Newline | `Shift+Enter` inserts a newline. |
| Keyboard: Cancel | `Escape` blurs the input (does not close the panel). |

### 4.2 Send Button `[▶]`

| Property | Value |
|----------|-------|
| Icon | `IconSend2` |
| Position | Right of textarea |
| Size | 38x38px, `rounded-[10px]` |
| Style | `bg-blue-600/80 text-white` |
| Hover | `bg-blue-600` |
| Disabled | When input is empty or whitespace: `opacity-40 cursor-not-allowed` |
| Behavior | Sends the current input as a user message. Clears the textarea. Focuses textarea again. |
| Backend | Calls `useAssistantChat.sendMessage(input)` → `POST /assistant-chat` with `{ thread_id, message }`. Returns SSE stream. |

### 4.3 Stop Button `[■]`

Replaces the Send button while streaming.

| Property | Value |
|----------|-------|
| Icon | `IconPlayerStop` |
| Position | Same position as Send (they swap) |
| Size | 38x38px, `rounded-[10px]` |
| Style | `bg-red-500/80 text-white` |
| Hover | `bg-red-500` |
| Behavior | Aborts the current SSE stream. The partial assistant response remains visible. The send button returns. |
| Backend | Calls `AbortController.abort()` on the active fetch. The backend receives the connection close and stops generating. The partial response persists in `assistant_messages` as-is. |

### 4.4 Attachment Button `[📎]` (future — placeholder)

| Property | Value |
|----------|-------|
| Icon | `IconPaperclip` |
| Position | Bottom-left, below the textarea |
| Visible | Always shown but disabled in v1. Tooltip: "Attachments coming soon". |
| Style | `opacity-40 cursor-not-allowed` |
| Future behavior | Opens a file picker. Attaches files to the message payload. Backend receives base64 or file reference. |

### 4.5 Hint Text

| Property | Value |
|----------|-------|
| Position | Bottom-left, after attachment button |
| Content (idle) | "Enter to send" |
| Content (streaming) | "Generating..." with a subtle pulse animation |
| Content (error) | "Failed — try again" in `text-red-400` |
| Style | `text-[11px] text-slate-500` |

### 4.6 Model Selector `[Sonnet 4.5 ▾]`

| Property | Value |
|----------|-------|
| Position | Bottom-right |
| Style | Pill shape: `rounded-full border border-slate-400/20 bg-[rgba(32,38,46,0.96)] px-2 h-[24px] text-[11px] font-medium text-slate-300` |
| Hover | `border-slate-400/40 text-white` |
| Icon | `IconChevronDown` (4px size) right of text |
| Behavior | Opens a dropdown listing available models. Selected model is checked. |
| Dropdown items | Each item shows model name and provider label. Grouped by provider (Anthropic, OpenAI, Google). |
| Backend | Selected model is passed as `model` param in the next `sendMessage()` call → `POST /assistant-chat { model }`. The backend resolves the model through its provider chain: explicit request → user default → platform role assignment → fallback. |

**Model selector dropdown:**

```
┌──────────────────────────────┐
│  Anthropic                   │
│   ✓ Claude Sonnet 4.5        │
│     Claude Opus 4            │
│     Claude Haiku 4.5         │
│  OpenAI                      │
│     GPT-4o                   │
│     GPT-4o mini              │
│  Google                      │
│     Gemini 2.0 Flash         │
└──────────────────────────────┘
```

| Element | Details |
|---------|---------|
| Group header | `text-[10px] text-slate-500 uppercase tracking-wide px-2 pt-2` |
| Item | `px-3 py-1.5 text-xs text-slate-200 hover:bg-white/8 cursor-pointer` |
| Selected | `text-blue-300` with `IconCheck` left of name |
| Item disabled | Models requiring API keys the user hasn't configured: `opacity-40 cursor-not-allowed`, tooltip: "Configure API key in Settings > AI" |
| Backend | Model list comes from `model_role_assignments` table + user's `ai_provider_keys`. Resolved at component mount, cached. |

---

## 5. Keyboard Shortcuts

All shortcuts are active when the chat window has focus.

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Send message | Composer focused, not empty |
| `Shift+Enter` | New line in composer | Composer focused |
| `Escape` | Close chat panel | Anywhere in chat window |
| `Ctrl/Cmd+Shift+N` | New thread | Anywhere in chat window |
| `Ctrl/Cmd+Shift+L` | Toggle chat panel open/close | Global (works from any page) |
| `Ctrl/Cmd+C` | Copy (standard) | Text selected in message area |
| `Up Arrow` | Edit last user message | Composer focused, composer empty |

---

## 6. Docked vs Floating — Behavioral Differences

The window internals are identical. These are the only differences:

| Aspect | Docked Column | Floating Draggable |
|--------|---------------|-------------------|
| Width | 420px (from `styleTokens.shell.assistantDockedWidth`) | 480px (from `styleTokens.shell.assistantFloatingWidth`) |
| Height | Full height: top bar to bottom of viewport | `min(70vh, 700px)` |
| Position | Fixed, right edge, below header bar | Free-drag anywhere. Stored in `localStorage`. |
| Content effect | `padding-inline-end` on main content area. Content reflows. Transition: 200ms ease. | None. Panel overlays content. |
| Border | `border-left: 1px solid` only | Full border + `border-radius: 12px` + drop shadow |
| Header drag | Cursor: default. Not draggable. | Cursor: grab/grabbing. Drag handle on header. |
| Pin button | Visible | Hidden |
| On route change | Stays open if pinned, closes if unpinned | Always stays open |
| Drop shadow | None | `box-shadow: 0 24px 64px rgba(0,0,0,0.34)` |
| Backdrop | None | None (no overlay behind it — content is still interactive) |
| Resize | Not resizable. Fixed width. | Future: drag from edges to resize. v1: fixed size. |

---

## 7. Backend Considerations Summary

Every user action that touches the backend:

| Action | Endpoint / Table | Method | Payload |
|--------|-----------------|--------|---------|
| Send message | `POST /assistant-chat` | Edge function | `{ thread_id?, message, model? }` → SSE stream |
| Stop streaming | Client-side `AbortController.abort()` | — | Connection close |
| New thread | No immediate backend call | — | Next `sendMessage` creates thread server-side |
| Load thread list | `assistant_threads` | Supabase query | `select('id, title, model, updated_at').order('updated_at', desc).limit(20)` |
| Load thread messages | `assistant_messages` | Supabase query | `select(...).eq('thread_id', id).order('created_at', asc)` |
| Delete thread | `assistant_threads` | Supabase delete | `.delete().eq('id', threadId)` — cascades to messages |
| Clear thread messages | `assistant_messages` | Supabase delete | `.delete().eq('thread_id', threadId)` |
| Edit user message | `POST /assistant-chat` | Edge function | Same as send. Client truncates local history first. Backend receives as new message. |
| Regenerate | `POST /assistant-chat` | Edge function | Re-sends previous user message. Client removes last assistant message first. |
| Thumbs up/down | `assistant_messages` | Supabase update | `.update({ metadata_jsonb: { feedback, feedback_detail? } }).eq('id', msgId)` |
| Update system prompt | `assistant_threads` | Supabase update | `.update({ context_jsonb: { system_prompt } }).eq('id', threadId)` |
| Export thread | None | Client-side | Generates markdown string from messages array, triggers download. |
| Change model | None immediately | Client-side state | Stored in component state. Sent with next `sendMessage()`. |

---

## 8. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Container role | `role="region" aria-label="AI Assistant"` |
| New messages | `aria-live="polite"` on message area for screen reader announcements |
| All buttons | `aria-label` on every icon button (no visible text) |
| Focus management | On open: focus moves to composer input. On close: focus returns to the toggle button in the top bar. |
| Keyboard navigation | Tab order: header buttons → message area → composer. Arrow keys navigate within header button group. |
| Color contrast | All text meets WCAG AA against the dark background. Action bar icons are at least 4.5:1 contrast ratio. |
| Reduced motion | `prefers-reduced-motion`: disable auto-scroll animation, pulse dots become static. |

---

## 9. Current vs Proposed — Delta

What exists today in `AssistantDockHost.tsx` vs what this spec adds:

| Feature | Current State | Proposed |
|---------|--------------|----------|
| Mode toggle (dock/float) | `onDetach` + `onToggleSide` (detach/side swap) | Single `[⇔]` toggle between docked and floating |
| Pin on navigation | Not implemented | `[📌]` button in docked mode |
| Thread history | Hook exists (`loadThreads`, `loadThread`) but no UI | `[⏱]` button with dropdown popover |
| New thread | `[+]` button exists | Keep, add keyboard shortcut |
| Settings/options | `[⚙]` and `[⋮]` buttons exist but are no-ops | `[⚙]` becomes functional menu (clear, export, system prompt, shortcuts) |
| Empty state chips | Not implemented | Contextual suggestion chips |
| Message bubbles | Basic text only | Markdown rendering with code block highlighting |
| Per-message actions | None | Copy, regenerate, thumbs up/down on assistant messages. Edit on user messages. |
| Code block controls | None | Language label + copy button per code block |
| Streaming cursor | Pulsing dots only | Dots → streaming text with blinking cursor |
| Error retry | Error banner, no retry | Error with `[Retry]` button |
| Composer | Single-line `<input>` | Multi-line `<textarea>` with auto-resize |
| Attachment | Not implemented | Placeholder button (disabled, future) |
| Model selector | Static "Sonnet 4.5" pill, not functional | Functional dropdown with available models |
| Keyboard shortcuts | `Enter` to send only | Full shortcut set (see Section 5) |
| Drag handle | Not implemented | Header becomes drag handle in floating mode |

---

## Sources

- [Cloudscape Design System — Generative AI Chat](https://cloudscape.design/patterns/genai/generative-AI-chat/)
- [assistant-ui — React AI Chat Library](https://www.assistant-ui.com/)
- [Cursor Docs — Chat Overview](https://docs.cursor.com/chat/overview)
- [Cursor Docs — Apply](https://docs.cursor.com/chat/apply)
- [Databricks — Use Databricks Assistant](https://docs.databricks.com/aws/en/notebooks/use-databricks-assistant)
- [ChatGPT UI Guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines/)
- [Where Should AI Sit in Your UI — UX Collective](https://uxdesign.cc/where-should-ai-sit-in-your-ui-1710a258390e)
- [Conversational AI UI Comparison 2025 — IntuitionLabs](https://intuitionlabs.ai/articles/conversational-ai-ui-comparison-2025)

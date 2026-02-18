import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { initLayoutResizers } from "./layoutResizers";

export type AiMode = "expanded" | "collapsed-line" | "floating-chip";

type LayoutShellProps = {
  title: string;
  subtitle?: string;
  navTitle?: string;
  mainTitle?: string;
  aiTitle?: string;
  aiMode?: AiMode;
  rightRail?: boolean;
  canvas?: boolean;
  statusLeft?: string;
  statusRight?: string;
  activeRailTab?: string;
  contextRailTabs?: ContextTab[];
  headerMenus?: KeyMenu[];
  nav?: ReactNode;
  main?: ReactNode;
  toolbar?: ReactNode;
  ai?: ReactNode;
};

type RailTab = {
  key: string;
  label: string;
  description: string;
  navTitle: string;
  railPosition?: "top" | "bottom";
  entries: Array<{ label: string; description: string }>;
};

type MenuNote = {
  key: string;
  label: string;
  description: string;
};

type KeyMenu = {
  key: "project" | "schema" | "run";
  label: string;
  description: string;
  notes: MenuNote[];
};

type ContextTab = {
  key: string;
  icon: string;
  label: string;
};

type MenuViewMode = "global" | "page" | "both";

const CONTEXT_CANVAS: ContextTab[] = [
  { key: "inspector", icon: "I", label: "Inspector" },
  { key: "schemas", icon: "S", label: "Schemas" },
  { key: "config", icon: "C", label: "Run Config" },
  { key: "history", icon: "H", label: "History" },
  { key: "export", icon: "E", label: "Export" },
];

const APP_RAIL_TABS: RailTab[] = [
  {
    key: "home",
    label: "Home",
    description: "Dashboard and recents.",
    navTitle: "Home",
    entries: [
      { label: "Quick actions", description: "New project, upload documents, create schema." },
      { label: "Recent documents", description: "Last active files across all projects." },
      { label: "Recent runs", description: "Current and recent processing runs." },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    description: "Project and document lists.",
    navTitle: "Projects",
    entries: [
      { label: "Project list", description: "Searchable list with active project highlight." },
      { label: "Create project", description: "Placeholder menu for new project flow." },
      { label: "Project documents", description: "Files scoped to selected project." },
    ],
  },
  {
    key: "schemas",
    label: "Schemas",
    description: "My schemas and templates.",
    navTitle: "Schemas",
    entries: [
      { label: "My schemas", description: "User-owned schema definitions." },
      { label: "Template library", description: "Curated starter schemas." },
      { label: "Schema search", description: "Filter and find schema definitions." },
    ],
  },
  {
    key: "studio",
    label: "Studio",
    description: "Current workspace and files.",
    navTitle: "Studio",
    entries: [
      { label: "Active project", description: "Current project context for this session." },
      { label: "Loaded documents", description: "Files attached to the current workspace." },
      { label: "Processing steps", description: "Transform, extract, and enrich stages." },
    ],
  },
  {
    key: "runs",
    label: "Runs",
    description: "Run queue and history.",
    navTitle: "Runs",
    entries: [
      { label: "Status filters", description: "All, queued, running, done, and failed." },
      { label: "Run list", description: "Most recent processing runs." },
      { label: "Run detail", description: "Summary view placeholder for selected run." },
    ],
  },
  {
    key: "integrations",
    label: "Integrations",
    description: "Agents, MCP, commands.",
    navTitle: "Integrations",
    entries: [
      { label: "Agents", description: "Configured model and assistant providers." },
      { label: "MCP servers", description: "Connector and tool registry placeholders." },
      { label: "Commands", description: "Automation command definitions (planned)." },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    description: "General, keys, admin.",
    navTitle: "Settings",
    railPosition: "bottom",
    entries: [
      { label: "General", description: "Workspace profile and defaults." },
      { label: "API keys", description: "Provider keys and model defaults." },
      { label: "Admin", description: "Superuser configuration surface." },
    ],
  },
];

const HEADER_KEY_MENUS: KeyMenu[] = [
  {
    key: "project",
    label: "Project",
    description: "Project Alpha",
    notes: [
      { key: "project-switch", label: "Project switcher", description: "Choose active project context." },
      { key: "project-scope", label: "Project scope", description: "Documents, schemas, and runs in current project." },
    ],
  },
  {
    key: "schema",
    label: "Schema",
    description: "legal_analysis_v1",
    notes: [
      { key: "schema-select", label: "Schema selector", description: "Pick active schema for current workflow." },
      { key: "schema-mode", label: "Schema mode", description: "Analyze, revise, or combined mode." },
    ],
  },
  {
    key: "run",
    label: "Run",
    description: "Idle",
    notes: [
      { key: "run-status", label: "Run status", description: "Queue, running, succeeded, failed." },
      { key: "run-log", label: "Run logs", description: "Execution logs and artifact links." },
    ],
  },
];

function activateFromKey(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  count: number,
  currentIndex: number,
  focusTarget: (index: number) => void,
): number | null {
  if (
    event.key !== "ArrowRight" &&
    event.key !== "ArrowDown" &&
    event.key !== "ArrowLeft" &&
    event.key !== "ArrowUp"
  ) {
    return null;
  }

  event.preventDefault();
  const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
  const next = (currentIndex + direction + count) % count;
  focusTarget(next);
  return next;
}

export default function LayoutShell({
  title,
  subtitle = "Grid layout prototype.",
  navTitle = "Explorer",
  mainTitle = "Workspace",
  aiTitle = "Copilot",
  aiMode = "expanded",
  rightRail = true,
  canvas = false,
  statusLeft = "Status: Layout frame active",
  statusRight = "Tip: Drag separators to resize panes",
  activeRailTab,
  contextRailTabs,
  headerMenus,
  nav,
  main,
  toolbar,
  ai,
}: LayoutShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const appRailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const contextRailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const initialRailIndex = APP_RAIL_TABS.findIndex((tab) => tab.key === activeRailTab);
  const [activeAppRail, setActiveAppRail] = useState<number>(initialRailIndex >= 0 ? initialRailIndex : 3);
  const [focusAppRail, setFocusAppRail] = useState<number>(initialRailIndex >= 0 ? initialRailIndex : 3);
  const [activeContextRail, setActiveContextRail] = useState<number>(0);
  const [focusContextRail, setFocusContextRail] = useState<number>(0);
  const [menuViewMode, setMenuViewMode] = useState<MenuViewMode>("both");

  const topRailTabs = APP_RAIL_TABS.filter((tab) => tab.railPosition !== "bottom");
  const bottomRailTabs = APP_RAIL_TABS.filter((tab) => tab.railPosition === "bottom");
  const activeExplorer = APP_RAIL_TABS[activeAppRail] ?? APP_RAIL_TABS[0];
  const effectiveContextTabs = contextRailTabs ?? CONTEXT_CANVAS;
  const effectiveHeaderMenus = headerMenus ?? HEADER_KEY_MENUS;

  useEffect(() => {
    if (!rootRef.current) return;
    initLayoutResizers(rootRef.current);
  }, []);

  const focusAppRailButton = (index: number) => appRailRefs.current[index]?.focus();
  const focusContextRailButton = (index: number) => contextRailRefs.current[index]?.focus();

  return (
    <div
      ref={rootRef}
      className="pm-shell"
      data-grid-frame
      data-ai-mode={aiMode}
      data-right-rail={rightRail ? "true" : "false"}
      data-nav-default="280"
      data-nav-min="240"
      data-nav-max="420"
      data-ai-default="360"
      data-ai-min="320"
      data-ai-max="460"
    >
      <header className="pm-header">
        <div className="pm-header-left">
          <span className="pm-header-title">{title}</span>
          <span className="pm-header-meta">{subtitle}</span>
        </div>
        <div className="pm-header-right">
          {effectiveHeaderMenus.map((menu) => (
            <div key={menu.key} className="pm-header-chip" title={menu.notes.map((n) => n.label).join(" | ")}>
              <div className="pm-header-chip-label">{menu.label}</div>
              <div className="pm-header-chip-value">{menu.description}</div>
            </div>
          ))}
        </div>
      </header>

      <aside className="pm-rail" aria-label="App rail">
        <div className="pm-tab-rail pm-tab-rail-main" role="tablist" aria-label="Main navigation">
          {topRailTabs.map((tab) => {
            const index = APP_RAIL_TABS.findIndex((entry) => entry.key === tab.key);
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  appRailRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                aria-selected={activeAppRail === index}
                aria-label={`${tab.label}. ${tab.description}`}
                tabIndex={focusAppRail === index ? 0 : -1}
                className={`pm-rail-btn${activeAppRail === index ? " is-active" : ""}`}
                onFocus={() => setFocusAppRail(index)}
                onClick={() => {
                  setFocusAppRail(index);
                  setActiveAppRail(index);
                }}
                onKeyDown={(event) => {
                  const next = activateFromKey(event, APP_RAIL_TABS.length, focusAppRail, focusAppRailButton);
                  if (next !== null) {
                    setFocusAppRail(next);
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveAppRail(index);
                  }
                }}
              >
                <span className="pm-rail-btn-dot" aria-hidden="true" />
                <span className="pm-rail-btn-label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pm-tab-rail pm-tab-rail-bottom" role="tablist" aria-label="System navigation">
          {bottomRailTabs.map((tab) => {
            const index = APP_RAIL_TABS.findIndex((entry) => entry.key === tab.key);
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  appRailRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                aria-selected={activeAppRail === index}
                aria-label={`${tab.label}. ${tab.description}`}
                tabIndex={focusAppRail === index ? 0 : -1}
                className={`pm-rail-btn${activeAppRail === index ? " is-active" : ""}`}
                onFocus={() => setFocusAppRail(index)}
                onClick={() => {
                  setFocusAppRail(index);
                  setActiveAppRail(index);
                }}
                onKeyDown={(event) => {
                  const next = activateFromKey(event, APP_RAIL_TABS.length, focusAppRail, focusAppRailButton);
                  if (next !== null) {
                    setFocusAppRail(next);
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveAppRail(index);
                  }
                }}
              >
                <span className="pm-rail-btn-dot" aria-hidden="true" />
                <span className="pm-rail-btn-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <nav className="pm-nav" aria-label="Explorer panel">
        <div className="pm-panel-title">{activeExplorer.navTitle || navTitle}</div>
        <div className="pm-nav-body">
          <div className="pm-nav-mode-switch" role="group" aria-label="Menu source view">
            <button
              type="button"
              className={`pm-nav-mode-link${menuViewMode === "global" ? " is-active" : ""}`}
              onClick={() => setMenuViewMode("global")}
            >
              Global
            </button>
            <button
              type="button"
              className={`pm-nav-mode-link${menuViewMode === "page" ? " is-active" : ""}`}
              onClick={() => setMenuViewMode("page")}
            >
              Page
            </button>
            <button
              type="button"
              className={`pm-nav-mode-link${menuViewMode === "both" ? " is-active" : ""}`}
              onClick={() => setMenuViewMode("both")}
            >
              Both
            </button>
          </div>

          {menuViewMode !== "page" ? (
            <>
              <div className="pm-nav-section-label">Global Menu Definition</div>
              <div className="pm-nav-description">{activeExplorer.description}</div>
              {activeExplorer.entries.map((entry, index) => (
                <div key={entry.label} className={`pm-list-item-static${index === 0 ? " is-active" : ""}`}>
                  <div className="pm-list-item-title">{entry.label}</div>
                  <div className="pm-list-item-desc">{entry.description}</div>
                </div>
              ))}
            </>
          ) : null}

          {menuViewMode !== "global" ? (
            <>
              <div className="pm-nav-section-label">Page Menu Sample</div>
              {nav ? <div className="pm-nav-custom">{nav}</div> : <div className="pm-nav-empty">No page menu provided.</div>}
            </>
          ) : null}
        </div>
      </nav>

      <button
        className="pm-split pm-split-nav"
        type="button"
        role="separator"
        aria-label="Resize explorer panel"
        aria-orientation="vertical"
        tabIndex={0}
        data-handle="nav"
      />

      <main className="pm-main" aria-label="Main panel">
        <div className="pm-panel-title">{mainTitle}</div>
        {canvas ? (
          <div className="pm-main-canvas">
            {main}
            {toolbar}
          </div>
        ) : (
          <div className="pm-main-body">{main}</div>
        )}
        <button className="pm-ai-chip" type="button" aria-label="Open AI assistant">
          AI
        </button>
      </main>

      <aside className="pm-rrail" aria-label="Right context rail">
        <div className="pm-tab-rail pm-tab-rail-context" role="tablist" aria-label="Context navigation">
          {effectiveContextTabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(node) => {
                contextRailRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeContextRail === index}
              aria-label={tab.label}
              tabIndex={focusContextRail === index ? 0 : -1}
              className={`pm-icon-btn${activeContextRail === index ? " is-active" : ""}`}
              onFocus={() => setFocusContextRail(index)}
              onClick={() => {
                setFocusContextRail(index);
                setActiveContextRail(index);
              }}
              onKeyDown={(event) => {
                const next = activateFromKey(event, effectiveContextTabs.length, focusContextRail, focusContextRailButton);
                if (next !== null) {
                  setFocusContextRail(next);
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveContextRail(index);
                }
              }}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </aside>

      <button
        className="pm-split pm-split-ai"
        type="button"
        role="separator"
        aria-label="Resize copilot panel"
        aria-orientation="vertical"
        tabIndex={0}
        data-handle="ai"
      />

      <aside className="pm-ai" aria-label="Copilot panel">
        <div className="pm-panel-title">{aiTitle}</div>
        <div className="pm-ai-body">{ai ?? "Assistant context and actions live here."}</div>
        <div className="pm-ai-input">Type a message...</div>
      </aside>

      <footer className="pm-footer">
        <span>{statusLeft}</span>
        <span>{statusRight}</span>
      </footer>
    </div>
  );
}

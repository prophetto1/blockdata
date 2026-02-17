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
  layoutsBase: string;
  nav?: ReactNode;
  main?: ReactNode;
  toolbar?: ReactNode;
  ai?: ReactNode;
};

type RailTab = {
  key: string;
  icon: string;
  label: string;
};

type ActionMenuItem = {
  key: string;
  label: string;
};

type ActionMenu = {
  key: "transform" | "extract" | "run";
  label: string;
  primary?: boolean;
  items: ActionMenuItem[];
};

const APP_RAIL_TABS: RailTab[] = [
  { key: "collections", icon: "C", label: "Collections" },
  { key: "environments", icon: "E", label: "Environments" },
  { key: "history", icon: "H", label: "History" },
  { key: "flows", icon: "F", label: "Flows" },
];

const CONTEXT_RAIL_TABS: RailTab[] = [
  { key: "settings", icon: "S", label: "Flow settings" },
  { key: "snapshots", icon: "P", label: "Snapshots" },
  { key: "scenarios", icon: "C", label: "Scenarios" },
  { key: "requests", icon: "R", label: "Requests" },
  { key: "slides", icon: "L", label: "Slides" },
];

const HEADER_ACTION_MENUS: ActionMenu[] = [
  {
    key: "transform",
    label: "Transform",
    items: [
      { key: "normalize", label: "Normalize text" },
      { key: "segment", label: "Segment sections" },
      { key: "clean", label: "Clean OCR artifacts" },
    ],
  },
  {
    key: "extract",
    label: "Extract",
    items: [
      { key: "entities", label: "Entities" },
      { key: "timeline", label: "Timeline events" },
      { key: "schema", label: "Custom schema" },
    ],
  },
  {
    key: "run",
    label: "Run",
    primary: true,
    items: [
      { key: "run-now", label: "Run now" },
      { key: "run-scenario", label: "Run scenario" },
      { key: "logs", label: "Open run logs" },
    ],
  },
];

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function activateFromKey(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  count: number,
  currentIndex: number,
  focusTarget: (index: number) => void,
): number | null {
  if (event.key !== "ArrowRight" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowUp") {
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
  layoutsBase,
  nav,
  main,
  toolbar,
  ai,
}: LayoutShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const appRailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const contextRailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerMenusRef = useRef<HTMLDivElement>(null);
  const [activeAppRail, setActiveAppRail] = useState<number>(3);
  const [focusAppRail, setFocusAppRail] = useState<number>(3);
  const [activeContextRail, setActiveContextRail] = useState<number>(0);
  const [focusContextRail, setFocusContextRail] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenu["key"] | null>(null);
  const normalizedNoDocs = normalizePath(window.location.pathname.replace(/^\/docs(\/|$)/, "/"));

  useEffect(() => {
    if (!rootRef.current) return;
    initLayoutResizers(rootRef.current);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const menuClickedInside = menuRef.current?.contains(event.target as Node);
      const actionClickedInside = headerMenusRef.current?.contains(event.target as Node);
      if (isMenuOpen && !menuClickedInside) {
        setIsMenuOpen(false);
      }
      if (openActionMenu && !actionClickedInside) {
        setOpenActionMenu(null);
      }
    };

    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setOpenActionMenu(null);
      }
    };

    document.addEventListener("pointerdown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isMenuOpen, openActionMenu]);

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
      <nav className="pm-devnav" aria-label="Dev navigation">
        <div ref={menuRef} className={`pm-devnav-menu${isMenuOpen ? " is-open" : ""}`}>
          <button
            className="pm-devnav-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            Layouts
          </button>
          <div className="pm-devnav-drop" role="menu" aria-label="Layout links">
            <a
              role="menuitem"
              href={layoutsBase}
              className={normalizedNoDocs === "/frontend/layouts/" || normalizedNoDocs === "/" ? "is-current" : undefined}
            >
              Index
            </a>
            <hr />
            <a
              role="menuitem"
              href={`${layoutsBase}flows-canvas-floating-ai/`}
              className={normalizedNoDocs === "/frontend/layouts/flows-canvas-floating-ai/" ? "is-current" : undefined}
            >
              Flows - Canvas A
            </a>
            <a
              role="menuitem"
              href={`${layoutsBase}flows-canvas-collapsed-line/`}
              className={normalizedNoDocs === "/frontend/layouts/flows-canvas-collapsed-line/" ? "is-current" : undefined}
            >
              Flows - Canvas B
            </a>
            <a
              role="menuitem"
              href={`${layoutsBase}request-editor-collapsed-ai/`}
              className={normalizedNoDocs === "/frontend/layouts/request-editor-collapsed-ai/" ? "is-current" : undefined}
            >
              Request Editor
            </a>
            <a
              role="menuitem"
              href={`${layoutsBase}documents-workbench-expanded-ai/`}
              className={normalizedNoDocs === "/frontend/layouts/documents-workbench-expanded-ai/" ? "is-current" : undefined}
            >
              Documents Workbench
            </a>
            <a
              role="menuitem"
              href={`${layoutsBase}runs-monitor-expanded-ai/`}
              className={normalizedNoDocs === "/frontend/layouts/runs-monitor-expanded-ai/" ? "is-current" : undefined}
            >
              Runs Monitor
            </a>
            <a
              role="menuitem"
              href={`${layoutsBase}settings-control-center/`}
              className={normalizedNoDocs === "/frontend/layouts/settings-control-center/" ? "is-current" : undefined}
            >
              Settings
            </a>
          </div>
        </div>
      </nav>

      <header className="pm-header">
        <div className="pm-header-left">
          <span className="pm-header-title">{title}</span>
          <span className="pm-header-meta">{subtitle}</span>
        </div>
        <div ref={headerMenusRef} className="pm-header-right">
          {HEADER_ACTION_MENUS.map((menu) => (
            <div
              key={menu.key}
              className={`pm-action-menu${openActionMenu === menu.key ? " is-open" : ""}`}
            >
              <button
                type="button"
                className={`pm-btn pm-btn-menu${menu.primary ? " pm-btn-run" : ""}`}
                aria-haspopup="menu"
                aria-expanded={openActionMenu === menu.key}
                onClick={() =>
                  setOpenActionMenu((current) => (current === menu.key ? null : menu.key))
                }
              >
                <span>{menu.label}</span>
                <span className="pm-btn-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              <div className="pm-action-dropdown" role="menu" aria-label={`${menu.label} actions`}>
                {menu.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className="pm-action-item"
                    onClick={() => {
                      setOpenActionMenu(null);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </header>

      <aside className="pm-rail" aria-label="App rail">
        <div className="pm-tab-rail" role="tablist" aria-label="Main navigation">
          {APP_RAIL_TABS.map((tab, index) => (
            <button
              key={tab.key}
              ref={(node) => {
                appRailRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeAppRail === index}
              aria-label={tab.label}
              tabIndex={focusAppRail === index ? 0 : -1}
              className={`pm-icon-btn${activeAppRail === index ? " is-active" : ""}`}
              onFocus={() => setFocusAppRail(index)}
              onClick={() => {
                setFocusAppRail(index);
                setActiveAppRail(index);
              }}
              onKeyDown={(event) => {
                const next = activateFromKey(
                  event,
                  APP_RAIL_TABS.length,
                  focusAppRail,
                  focusAppRailButton,
                );
                if (next !== null) {
                  setFocusAppRail(next);
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveAppRail(index);
                }
              }}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </aside>

      <nav className="pm-nav" aria-label="Explorer panel">
        <div className="pm-panel-title">{navTitle}</div>
        <div className="pm-nav-body">
          {nav ?? (
            <>
              <button type="button" className="pm-list-item is-active">
                Primary resource
              </button>
              <button type="button" className="pm-list-item">
                Secondary resource
              </button>
              <button type="button" className="pm-list-item">
                Third resource
              </button>
            </>
          )}
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
        <div className="pm-tab-rail" role="tablist" aria-label="Context navigation">
          {CONTEXT_RAIL_TABS.map((tab, index) => (
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
                const next = activateFromKey(
                  event,
                  CONTEXT_RAIL_TABS.length,
                  focusContextRail,
                  focusContextRailButton,
                );
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

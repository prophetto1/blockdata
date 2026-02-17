import FlowCanvas from "./prototype/FlowCanvas";
import LayoutShell from "./prototype/LayoutShell";
import "./prototype/layout-shell.css";

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getLayoutsBase(pathname: string): string {
  return pathname.startsWith("/docs/frontend/layouts/") ? "/docs/frontend/layouts/" : "/frontend/layouts/";
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button type="button" className={`pm-list-item${active ? " is-active" : ""}`}>
      {label}
    </button>
  );
}

function LayoutIndexPage({ layoutsBase }: { layoutsBase: string }) {
  return (
    <div className="pm-layout-index">
      <h1>Frontend Layout Prototypes</h1>
      <p>
        Six finished grid pages with AI collapsed into the vertical line across layouts.
      </p>
      <ul>
        <li>
          <a href={`${layoutsBase}flows-canvas-floating-ai/`}>
            Flows Canvas (Layout A)
          </a>
        </li>
        <li>
          <a href={`${layoutsBase}flows-canvas-collapsed-line/`}>
            Flows Canvas (Layout B)
          </a>
        </li>
        <li>
          <a href={`${layoutsBase}request-editor-collapsed-ai/`}>
            Request Editor
          </a>
        </li>
        <li>
          <a href={`${layoutsBase}documents-workbench-expanded-ai/`}>
            Documents Workbench
          </a>
        </li>
        <li>
          <a href={`${layoutsBase}runs-monitor-expanded-ai/`}>
            Runs Monitor
          </a>
        </li>
        <li>
          <a href={`${layoutsBase}settings-control-center/`}>
            Settings Control Center
          </a>
        </li>
      </ul>
    </div>
  );
}

function FlowsCanvasFloatingAi({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Flows Canvas"
      subtitle="AI chip floats above canvas while right rail stays hidden."
      navTitle="Environments"
      mainTitle="New Flow"
      aiMode="floating-chip"
      canvas
      statusLeft="Status: Flow canvas layout"
      statusRight="AI mode: floating chip"
      nav={
        <>
          <NavItem label="Globals" active />
          <NavItem label="Production" />
          <NavItem label="Staging" />
          <NavItem label="Dev Sandbox" />
        </>
      }
      main={<FlowCanvas />}
      toolbar={
        <div className="pm-toolbar" role="toolbar" aria-label="Canvas toolbar">
          <button type="button" aria-label="Undo">
            U
          </button>
          <button type="button" aria-label="Redo">
            R
          </button>
          <button type="button" aria-label="Zoom out">
            -
          </button>
          <button type="button" aria-label="Zoom in">
            +
          </button>
          <button type="button" aria-label="Fit view">
            F
          </button>
        </div>
      }
    />
  );
}

function FlowsCanvasCollapsedLine({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Flows Canvas"
      subtitle="AI panel collapsed to a thin line while right rail remains active."
      navTitle="Collections"
      mainTitle="Flow Studio"
      aiMode="collapsed-line"
      canvas
      statusLeft="Status: Flow canvas layout"
      statusRight="AI mode: collapsed line"
      nav={
        <>
          <NavItem label="Legal Collection" active />
          <NavItem label="Research Collection" />
          <NavItem label="Prompt Library" />
          <NavItem label="Archived Flows" />
        </>
      }
      main={<FlowCanvas />}
      toolbar={
        <div className="pm-toolbar" role="toolbar" aria-label="Canvas toolbar">
          <button type="button" aria-label="Undo">
            U
          </button>
          <button type="button" aria-label="Redo">
            R
          </button>
          <button type="button" aria-label="Zoom out">
            -
          </button>
          <button type="button" aria-label="Zoom in">
            +
          </button>
          <button type="button" aria-label="Run">
            R
          </button>
        </div>
      }
    />
  );
}

function RequestEditorCollapsedAi({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Request Editor"
      subtitle="Request/response layout with AI lane collapsed."
      navTitle="Environments"
      mainTitle="Untitled Request"
      aiMode="collapsed-line"
      statusLeft="Status: Request page layout"
      statusRight="AI mode: collapsed line"
      nav={
        <>
          <NavItem label="Globals" active />
          <NavItem label="Production Vars" />
          <NavItem label="Staging Vars" />
        </>
      }
      main={
        <>
          <div className="pm-placeholder-card">
            <strong>Request Bar</strong>
            <div className="pm-request-grid">
              <button className="pm-btn" type="button">
                GET
              </button>
              <div className="pm-ai-input pm-ai-input-inline">
                Enter URL or paste text
              </div>
              <button className="pm-btn pm-btn-run" type="button">
                Send
              </button>
            </div>
          </div>

          <div className="pm-placeholder-card">
            <strong>Params</strong>
            <table className="pm-table pm-card-stack-gap">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>limit</td>
                  <td>100</td>
                  <td>Row limit</td>
                </tr>
                <tr>
                  <td>cursor</td>
                  <td />
                  <td>Pagination cursor</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pm-placeholder-card">
            <strong>Response</strong>
            <div className="pm-card-note">Response inspector region (status, body, headers).</div>
          </div>
        </>
      }
    />
  );
}

function DocumentsWorkbenchExpandedAi({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Documents Workbench"
      subtitle="Ingest/preview/result composition with AI collapsed."
      navTitle="Files"
      mainTitle="Transform + Extract"
      aiMode="collapsed-line"
      statusLeft="Status: Document workbench layout"
      statusRight="AI mode: collapsed line"
      nav={
        <>
          <NavItem label="jwc_cv_2026.pdf" active />
          <NavItem label="case-1-bba59aa7.pdf" />
          <NavItem label="ACT-1.docx" />
        </>
      }
      main={
        <div className="pm-split-pane">
          <div className="pm-placeholder-card pm-card-min-h">
            <strong>Preview Pane</strong>
            <div className="pm-card-note">PDF page canvas + bounding overlays.</div>
          </div>
          <div className="pm-placeholder-card pm-card-min-h">
            <strong>Result Pane</strong>
            <div className="pm-card-note">Formatted and JSON output toggles.</div>
          </div>
        </div>
      }
      ai={
        <div className="pm-placeholder-card">
          <strong>Assistant Actions</strong>
          <div className="pm-card-note">
            Schema suggestions, quality checks, and extraction prompts.
          </div>
        </div>
      }
    />
  );
}

function RunsMonitorExpandedAi({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Runs Monitor"
      subtitle="Operational monitoring view with AI collapsed into the vertical line."
      navTitle="Projects"
      mainTitle="Execution Monitoring"
      aiMode="collapsed-line"
      statusLeft="Status: Monitoring layout"
      statusRight="AI mode: collapsed line"
      nav={
        <>
          <NavItem label="Project Alpha" active />
          <NavItem label="Project Beta" />
          <NavItem label="Project Gamma" />
        </>
      }
      main={
        <>
          <div className="pm-kpi-grid">
            <div className="pm-kpi">
              <strong>Queued</strong>
              <div className="pm-stat-value">19</div>
            </div>
            <div className="pm-kpi">
              <strong>Running</strong>
              <div className="pm-stat-value">7</div>
            </div>
            <div className="pm-kpi">
              <strong>Failed</strong>
              <div className="pm-stat-value">2</div>
            </div>
          </div>

          <div className="pm-placeholder-card pm-card-stack-gap">
            <strong>Recent Runs</strong>
            <table className="pm-table pm-card-stack-gap">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>run_2026_02_17_001</td>
                  <td>running</td>
                  <td>06:10</td>
                  <td>03:21</td>
                </tr>
                <tr>
                  <td>run_2026_02_17_000</td>
                  <td>success</td>
                  <td>05:42</td>
                  <td>04:09</td>
                </tr>
                <tr>
                  <td>run_2026_02_16_118</td>
                  <td>failed</td>
                  <td>23:12</td>
                  <td>00:57</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      }
      ai={
        <div className="pm-placeholder-card">
          <strong>Run Triage</strong>
          <div className="pm-card-note">AI summaries, failure clustering, and suggested retries.</div>
        </div>
      }
    />
  );
}

function SettingsControlCenter({ layoutsBase }: { layoutsBase: string }) {
  return (
    <LayoutShell
      layoutsBase={layoutsBase}
      title="Settings Control Center"
      subtitle="Administrative settings surface with AI collapsed into the vertical line."
      navTitle="Settings Sections"
      mainTitle="Workspace Settings"
      aiMode="collapsed-line"
      statusLeft="Status: Settings layout"
      statusRight="AI mode: collapsed line"
      nav={
        <>
          <NavItem label="General" active />
          <NavItem label="Members" />
          <NavItem label="Integrations" />
          <NavItem label="Security" />
        </>
      }
      main={
        <>
          <div className="pm-placeholder-card">
            <strong>General</strong>
            <div className="pm-settings-grid">
              <div className="pm-ai-input pm-ai-input-inline">
                Workspace Name
              </div>
              <div className="pm-ai-input pm-ai-input-inline">
                Default Region
              </div>
            </div>
          </div>

          <div className="pm-placeholder-card">
            <strong>Policies</strong>
            <table className="pm-table pm-card-stack-gap">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Value</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Retention</td>
                  <td>90 days</td>
                  <td>Workspace</td>
                </tr>
                <tr>
                  <td>Max Upload Size</td>
                  <td>50 MB</td>
                  <td>Organization</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      }
      ai={
        <div className="pm-placeholder-card">
          <strong>Config Guidance</strong>
          <div className="pm-card-note">
            Ask for recommended defaults and migration-safe changes.
          </div>
        </div>
      }
    />
  );
}

function NotFound({ layoutsBase }: { layoutsBase: string }) {
  return (
    <div className="pm-not-found">
      <h1>Prototype Page Not Found</h1>
      <p>
        Open <a href={layoutsBase}>the layout index</a> to navigate to available pages.
      </p>
    </div>
  );
}

function App() {
  const normalizedPath = normalizePath(window.location.pathname);
  const normalizedNoDocs = normalizePath(normalizedPath.replace(/^\/docs(\/|$)/, "/"));
  const layoutsBase = getLayoutsBase(normalizedPath);

  if (normalizedNoDocs === "/frontend/layouts/" || normalizedNoDocs === "/") {
    return <LayoutIndexPage layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/flows-canvas-floating-ai/") {
    return <FlowsCanvasFloatingAi layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/flows-canvas-collapsed-line/") {
    return <FlowsCanvasCollapsedLine layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/request-editor-collapsed-ai/") {
    return <RequestEditorCollapsedAi layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/documents-workbench-expanded-ai/") {
    return <DocumentsWorkbenchExpandedAi layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/runs-monitor-expanded-ai/") {
    return <RunsMonitorExpandedAi layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/settings-control-center/") {
    return <SettingsControlCenter layoutsBase={layoutsBase} />;
  }

  return <NotFound layoutsBase={layoutsBase} />;
}

export default App;

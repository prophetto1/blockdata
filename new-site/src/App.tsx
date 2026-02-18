import { useEffect, useState, type CSSProperties } from "react";
import "./prototype/layout-shell.css";
const masterSpecMarkdown = `Rules
1. Shell geometry uses custom CSS Grid (not Mantine AppShell).
2. Token-only styling: no ad hoc hex, spacing, or radius values.
3. Tooling shell contract: header + left rail + main + optional right assistant pane.
4. Resizer rules: 10px hit area, 3px drag threshold, width persistence, double-click reset.
5. Pane overflow rules: each pane owns scroll, with min-width:0 and min-height:0.
6. Interaction/accessibility: visible focus ring, keyboard-safe controls, reduced-motion support.

Stack
React + TypeScript + Vite + Mantine + @xyflow/react
`;

type SessionRoute =
  | "nonauth-1"
  | "auth-1"
  | "canvas-1"
  | "nonauth-2"
  | "auth-2"
  | "canvas-2"
  | "nonauth-v2"
  | "auth-v2"
  | "canvas-v2"
  | "playground-1"
  | "playground-2"
  | "playground-3"
  | "playground-4"
  | "spec-wireframe-1";

const sessionSetOne: Array<{ key: SessionRoute; label: string; hrefSuffix: string }> = [
  { key: "nonauth-1", label: "nonauth-1", hrefSuffix: "nonauth-1/" },
  { key: "auth-1", label: "auth-1", hrefSuffix: "auth-1/" },
  { key: "canvas-1", label: "canvas-1", hrefSuffix: "canvas-1/" },
];

const sessionSetTwo: Array<{ key: SessionRoute; label: string; hrefSuffix: string }> = [
  { key: "nonauth-2", label: "nonauth-2", hrefSuffix: "nonauth-2/" },
  { key: "auth-2", label: "auth-2", hrefSuffix: "auth-2/" },
  { key: "canvas-2", label: "canvas-2", hrefSuffix: "canvas-2/" },
];

const sessionSetV2: Array<{ key: SessionRoute; label: string; hrefSuffix: string }> = [
  { key: "nonauth-v2", label: "nonauth-v2", hrefSuffix: "nonauth-v2/" },
  { key: "auth-v2", label: "auth-v2", hrefSuffix: "auth-v2/" },
  { key: "canvas-v2", label: "canvas-v2", hrefSuffix: "canvas-v2/" },
  { key: "playground-1", label: "playground-1", hrefSuffix: "playground-1/" },
  { key: "playground-2", label: "playground-2", hrefSuffix: "playground-2/" },
  { key: "playground-3", label: "playground-3", hrefSuffix: "playground-3/" },
  { key: "playground-4", label: "playground-4", hrefSuffix: "playground-4/" },
  { key: "spec-wireframe-1", label: "spec-wireframe-1", hrefSuffix: "spec-wireframe-1/" },
];

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getLayoutsBase(pathname: string): string {
  return pathname.startsWith("/docs/frontend/layouts/") ? "/docs/frontend/layouts/" : "/frontend/layouts/";
}

function WireframeIndex({ layoutsBase }: { layoutsBase: string }) {
  return (
    <div className="pm-layout-index">
      <h1>V2 Wireframe Prototypes</h1>
      <p>Current design wireframes.</p>
      <ul>
        {sessionSetV2.map((item) => (
          <li key={item.key}>
            <a href={`${layoutsBase}${item.hrefSuffix}`}>{item.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function resolveSessionRoute(normalizedNoDocs: string): SessionRoute | null {
  if (normalizedNoDocs === "/frontend/layouts/nonauth-1/") return "nonauth-1";
  if (normalizedNoDocs === "/frontend/layouts/auth-1/") return "auth-1";
  if (normalizedNoDocs === "/frontend/layouts/canvas-1/") return "canvas-1";
  if (normalizedNoDocs === "/frontend/layouts/nonauth-2/") return "nonauth-2";
  if (normalizedNoDocs === "/frontend/layouts/auth-2/") return "auth-2";
  if (normalizedNoDocs === "/frontend/layouts/canvas-2/") return "canvas-2";
  if (normalizedNoDocs === "/frontend/layouts/nonauth-v2/") return "nonauth-v2";
  if (normalizedNoDocs === "/frontend/layouts/auth-v2/") return "auth-v2";
  if (normalizedNoDocs === "/frontend/layouts/canvas-v2/") return "canvas-v2";
  if (normalizedNoDocs === "/frontend/layouts/playground-1/") return "playground-1";
  if (normalizedNoDocs === "/frontend/layouts/playground-2/") return "playground-2";
  if (normalizedNoDocs === "/frontend/layouts/playground-3/") return "playground-3";
  if (normalizedNoDocs === "/frontend/layouts/playground-4/") return "playground-4";
  if (normalizedNoDocs === "/frontend/layouts/spec-wireframe-1/") return "spec-wireframe-1";
  return null;
}

function sessionPageText(route: SessionRoute): { title: string; text: string } {
  if (route === "canvas-v2") {
    return {
      title: "canvas-v2",
      text: "Tooling shell wireframe: 52px header, 224px left nav, fluid work area, 360px right configuration pane, and collapsible 360px AI assistant tab with snap-to-thin-bar behavior.",
    };
  }
  if (route === "playground-1") {
    return {
      title: "playground-1",
      text: "Configured parse workbench wireframe: upload/preview work area plus right configuration inspector. Inspector controls are placeholders and will map to internal parser/extender options.",
    };
  }
  if (route === "playground-2") {
    return {
      title: "playground-2",
      text: "Same as playground-1 plus a dedicated 220px explorer/secondary column for workspace/session context.",
    };
  }
  if (route === "playground-3") {
    return {
      title: "playground-3",
      text: "Table-first variant: keeps global shell zones and replaces upload/config emphasis with a structured run/document table as the primary surface.",
    };
  }
  if (route === "playground-4") {
    return {
      title: "playground-4",
      text: "React Flow canvas variant: reserves a full dark canvas region. React Flow module already exists in-repo and is the required implementation path for future playground-4 pages.",
    };
  }
  if (route === "spec-wireframe-1") {
    return {
      title: "spec-wireframe-1",
      text: "Raw markdown reference view of new-site/2026-02-17-frontend-redesign-master-spec-v1.md for direct design guidance.",
    };
  }

  return {
    title: route,
    text: "",
  };
}

function SessionWireframeV2({ route }: { route: SessionRoute }) {
  const shellContract = {
    header: 52,
    rail: 224,
    explorer: 220,
    assistant: 360,
    aiTab: 40,
  };
  const defaultConfigWidth = shellContract.assistant;
  const defaultAiWidth = shellContract.assistant;
  const configCollapseThreshold = 160;
  const aiSnapToTabThreshold = 80;
  const minResizableWidth = 120;
  const maxResizableWidth = 920;

  const [aiMode, setAiMode] = useState<"closed" | "open">("closed");
  const [configVisible, setConfigVisible] = useState(true);
  const [configWidth, setConfigWidth] = useState(defaultConfigWidth);
  const [aiWidth, setAiWidth] = useState(defaultAiWidth);
  const [resizeDrag, setResizeDrag] = useState<{
    target: "config" | "ai";
    startX: number;
    startWidth: number;
  } | null>(null);
  const isTablePlayground = route === "playground-3";
  const isReactFlowPlayground = route === "playground-4";
  const isSpecWireframe = route === "spec-wireframe-1";
  const isConfigExample = route === "playground-1" || route === "playground-2";
  const isCanvasV2 =
    route === "canvas-v2" ||
    route === "playground-1" ||
    route === "playground-2" ||
    route === "playground-3" ||
    route === "playground-4";
  const useConnectedShell = isCanvasV2;
  const hasSecondaryColumn = route === "playground-2" || route === "playground-3" || route === "playground-4";
  const paneLineColor = "#111111";
  const dims = {
    top: shellContract.header,
    left: shellContract.rail,
    secondary: shellContract.explorer,
    right: shellContract.assistant,
    aiTab: shellContract.aiTab,
  };
  const nonAuthContentWidth = "min(92vw, 1180px)";
  const nonAuthReadableWidth = "min(92vw, 760px)";

  useEffect(() => {
    if (!resizeDrag) return;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const onPointerMove = (event: PointerEvent) => {
      const nextWidth = clamp(
        resizeDrag.startWidth + (resizeDrag.startX - event.clientX),
        minResizableWidth,
        maxResizableWidth,
      );

      if (resizeDrag.target === "config") {
        setConfigWidth(nextWidth);
      } else {
        setAiWidth(nextWidth);
      }
    };

    const onPointerUp = () => {
      if (resizeDrag.target === "config" && configWidth <= configCollapseThreshold) {
        setConfigVisible(false);
        setConfigWidth(defaultConfigWidth);
      }
      if (resizeDrag.target === "ai" && aiWidth <= aiSnapToTabThreshold) {
        setAiMode("closed");
        setAiWidth(defaultAiWidth);
      }
      setResizeDrag(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [resizeDrag, configWidth, aiWidth]);

  const boxBase: CSSProperties = {
    border: useConnectedShell ? "0" : "1px solid #111111",
    background: useConnectedShell ? "#fbfbfb" : "#f7f7f7",
    borderRadius: useConnectedShell ? "0px" : "6px",
    boxShadow: useConnectedShell
      ? `inset -1px 0 0 ${paneLineColor}, inset 0 -1px 0 ${paneLineColor}`
      : "none",
    padding: "10px",
    fontSize: "12px",
    lineHeight: 1.3,
    overflow: "hidden",
  };

  if (isSpecWireframe) {
    const specLineCount = masterSpecMarkdown.split(/\r?\n/).length;
    return (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "34px minmax(0, 1fr)",
          border: "1px solid #111",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid #111",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            fontSize: "11px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        >
          <span>raw-md viewer | non-website wireframe</span>
          <span>{specLineCount} lines</span>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "12px",
            overflow: "auto",
            minHeight: 0,
            whiteSpace: "pre",
            fontSize: "11px",
            lineHeight: 1.45,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            background: "#ffffff",
          }}
        >
          {masterSpecMarkdown}
        </pre>
      </div>
    );
  }

  if (route === "nonauth-v2") {
    return (
      <div style={{ display: "grid", gridTemplateRows: `${dims.top}px minmax(0, 1fr)`, height: "100%" }}>
        <div style={{ ...boxBase, borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <strong style={{ fontSize: "14px" }}>blockdata</strong>
            <span style={{ fontSize: "11px", color: "#666" }}>top bar {dims.top}px</span>
          </div>
          <div style={{ display: "inline-flex", gap: "8px" }}>
            <button type="button" style={{ fontSize: "11px" }}>Sign In</button>
            <button type="button" style={{ fontSize: "11px", fontWeight: 600, background: "#111", color: "#fff", border: "1px solid #111", borderRadius: "4px", padding: "4px 12px" }}>Get Started</button>
          </div>
        </div>
        <div style={{ ...boxBase, marginTop: "10px", minHeight: 0, overflow: "auto" }}>
          <div
            style={{
              maxWidth: nonAuthContentWidth,
              margin: "0 auto",
              position: "relative",
              minHeight: "100%",
            }}
          >
            <aside
              style={{
                border: "1px solid #111",
                background: "#fff",
                padding: "10px",
                fontSize: "11px",
                width: "220px",
                zIndex: 1,
                left: "-300px",
                top: "0",
                position: "absolute",
                boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>Temporary Spec Side Rail</div>
              <div>Planning aid only. This left rail is not part of final nonauth-v2.</div>
              <div style={{ marginTop: "4px" }}>source: new-site/2026-02-17-frontend-redesign-master-spec-v1.md</div>
              <div style={{ marginTop: "8px", fontWeight: 600 }}>Key rules</div>
              <div>1. Shell geometry uses custom CSS Grid (not Mantine AppShell).</div>
              <div>2. Token-only styling: no ad hoc hex, spacing, or radius values.</div>
              <div>3. Tooling shell contract: header + left rail + main + optional right assistant pane.</div>
              <div>4. Resizer rules: 10px hit area, 3px drag threshold, width persistence, double-click reset.</div>
              <div>5. Pane overflow rules: each pane owns scroll, with min-width:0 and min-height:0.</div>
              <div>6. Interaction/accessibility: visible focus ring, keyboard-safe controls, reduced-motion support.</div>
              <div style={{ marginTop: "8px", fontWeight: 600 }}>Stack</div>
              <div>React + TypeScript + Vite + Mantine + @xyflow/react</div>
            </aside>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
                <div style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Document Intelligence Platform</div>
                <div style={{ fontSize: "13px", color: "#555", maxWidth: nonAuthReadableWidth, margin: "0 auto" }}>
                  Upload documents, define extraction schemas, and get structured data back. Powered by LLMs with full pipeline control.
                </div>
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#666" }}>
                  Content width rule: min(92vw, 1180px)
                </div>
                <div style={{ marginTop: "16px", display: "inline-flex", gap: "8px" }}>
                  <button type="button" style={{ fontWeight: 600, background: "#111", color: "#fff", border: "1px solid #111", borderRadius: "4px", padding: "8px 20px" }}>Start Free</button>
                  <button type="button" style={{ border: "1px solid #999", borderRadius: "4px", padding: "8px 20px" }}>View Demo</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {[
                  { title: "Upload", desc: "PDF, DOCX, images. Drag-and-drop or API." },
                  { title: "Schema", desc: "Define fields the LLM extracts per block." },
                  { title: "Extract", desc: "Structured JSON output, batch or streaming." },
                ].map((card) => (
                  <div key={card.title} style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "12px", background: "#fff" }}>
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>{card.title}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>{card.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px dashed #444", padding: "16px", minHeight: "120px", textAlign: "center", color: "#666" }}>
                product screenshot / demo video placeholder
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (route === "auth-v2") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateRows: `${dims.top}px minmax(0, 1fr)`,
          gap: "10px",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div style={{ ...boxBase, gridRow: "1", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <strong style={{ fontSize: "14px" }}>blockdata</strong>
            <span style={{ fontSize: "11px", color: "#666" }}>auth header {dims.top}px</span>
          </div>
          <div style={{ fontSize: "11px", color: "#666" }}>Auth surface</div>
        </div>
        <div
          style={{
            ...boxBase,
            gridRow: "2",
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            placeItems: "center",
            overflow: "auto",
          }}
        >
          <div style={{ width: "min(92vw, 480px)", border: "1px solid #111", background: "#fff", padding: "18px", borderRadius: "8px" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>Sign in</div>
            <div style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>
              Auth container width rule: min(92vw, 480px)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "11px", color: "#444" }}>
                Email
                <input type="text" value="name@company.com" readOnly style={{ marginTop: "4px", width: "100%" }} />
              </label>
              <label style={{ fontSize: "11px", color: "#444" }}>
                Password
                <input type="password" value="password" readOnly style={{ marginTop: "4px", width: "100%" }} />
              </label>
              <button type="button" style={{ marginTop: "6px", fontWeight: 600, background: "#111", color: "#fff", border: "1px solid #111", borderRadius: "4px", padding: "8px 12px" }}>
                Sign In
              </button>
              <button type="button" style={{ border: "1px solid #999", borderRadius: "4px", padding: "8px 12px" }}>
                Continue with SSO
              </button>
              <div style={{ marginTop: "4px", fontSize: "11px", color: "#666", textAlign: "center" }}>
                No account? Create one
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startResize = (target: "config" | "ai") => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setResizeDrag({
      target,
      startX: event.clientX,
      startWidth: target === "config" ? configWidth : aiWidth,
    });
  };

  const columns: string[] = [`${dims.left}px`];
  if (hasSecondaryColumn) {
    columns.push(`${dims.secondary}px`);
  }
  columns.push("minmax(0, 1fr)");
  if (!isTablePlayground && configVisible) {
    columns.push("10px", `${configWidth}px`);
  }
  if (aiMode === "open") {
    columns.push("10px", `${aiWidth}px`);
  } else {
    columns.push(`${dims.aiTab}px`);
  }

  const mainColIndex = hasSecondaryColumn ? 3 : 2;
  let nextColIndex = mainColIndex + 1;

  const configHandleCol = !isTablePlayground && configVisible ? String(nextColIndex) : null;
  const configCol = !isTablePlayground && configVisible ? String(nextColIndex + 1) : null;
  if (!isTablePlayground && configVisible) {
    nextColIndex += 2;
  }

  const aiHandleCol = aiMode === "open" ? String(nextColIndex) : null;
  const aiCol = aiMode === "open" ? String(nextColIndex + 1) : String(nextColIndex);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns.join(" "),
        gridTemplateRows: `${dims.top}px minmax(0, 1fr)`,
        gap: useConnectedShell ? "0px" : "10px",
        height: "100%",
        minHeight: 0,
        position: "relative",
        border: useConnectedShell ? `1px solid ${paneLineColor}` : "0",
        overflow: "hidden",
      }}
    >
      <div style={{ ...boxBase, gridColumn: "1", gridRow: "1 / span 2" }}>
        <strong>left app rail {dims.left}px</strong>
        {isCanvasV2 ? (
          <div style={{ marginTop: "8px" }}>
            <div>Global level-1 navigation rail.</div>
          </div>
        ) : null}
      </div>
      <div style={{ ...boxBase, gridColumn: "2 / -1", gridRow: "1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span>
          <strong>header {dims.top}px</strong>
          {isCanvasV2 ? " - page title, environment selector, global actions" : ""}
        </span>
        <div style={{ display: "inline-flex", gap: "6px" }}>
          {!isTablePlayground && !isReactFlowPlayground ? (
            <button type="button" onClick={() => setConfigVisible((v) => !v)} style={{ fontSize: "11px" }}>
              {configVisible ? "hide config" : "show config"}
            </button>
          ) : null}
          <button type="button" onClick={() => setAiMode((m) => (m === "open" ? "closed" : "open"))} style={{ fontSize: "11px" }}>
            {aiMode === "open" ? "ai pull in" : "ai pull out"}
          </button>
        </div>
      </div>
      {hasSecondaryColumn ? (
        <div style={{ ...boxBase, gridColumn: "2", gridRow: "2", minWidth: 0, minHeight: 0 }}>
          <strong>explorer / secondary nav {dims.secondary}px</strong>
          <div style={{ marginTop: "8px", border: "1px solid #333", background: "#fff", padding: "8px" }}>
            Context rail for project/session scope.
          </div>
          <div style={{ marginTop: "8px", border: "1px dashed #444", background: "#fff", padding: "8px", minHeight: "120px" }}>
            Example contents:
            <div>1. Active workspace and parser profile</div>
            <div>2. Current files list / staged set</div>
            <div>3. Preset templates / quick actions</div>
          </div>
        </div>
      ) : null}
      <div
        style={{
          ...boxBase,
          ...(isReactFlowPlayground ? { background: "#000000", color: "#f1f1f1" } : {}),
          gridColumn: String(mainColIndex),
          gridRow: "2",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {isReactFlowPlayground ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <strong>react flow surface placeholder</strong>
            <div
              style={{
                marginTop: "8px",
                border: "1px solid #4b4b4b",
                background: "#121212",
                color: "#f1f1f1",
                padding: "10px",
              }}
            >
              React Flow module is already integrated in this repository.
            </div>
            <div
              style={{
                marginTop: "8px",
                border: "1px solid #555",
                background: "#1a1a1a",
                color: "#f1f1f1",
                padding: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                flex: 1,
                minHeight: 0,
              }}
            >
              This page intentionally reserves a dark React Flow canvas region.
              <br />
              Any new page requested under playground-4 will implement and use the in-repo React Flow module.
            </div>
          </div>
        ) : isTablePlayground ? (
          <>
            <strong>table area</strong>
            <div style={{ marginTop: "8px", border: "1px solid #333", background: "#fff", padding: "8px" }}>
              Main surface is a table-first workspace. Upload/config patterns are not shown here.
            </div>
            <div style={{ marginTop: "8px", border: "1px solid #333", background: "#fff", minHeight: "260px", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #bbb", padding: "8px" }}>Run ID</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #bbb", padding: "8px" }}>Document</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #bbb", padding: "8px" }}>Parser</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #bbb", padding: "8px" }}>Status</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #bbb", padding: "8px" }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>run_12031</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>jwc_cv_2026.pdf</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>docling</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>completed</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>09:41</td>
                  </tr>
                  <tr>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>run_12032</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>case-1-bba59aa7.pdf</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>docling</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>running</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>09:43</td>
                  </tr>
                  <tr>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>run_12033</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>ACT-1.docx</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>docling</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>queued</td>
                    <td style={{ borderBottom: "1px solid #e2e2e2", padding: "8px" }}>09:44</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : isConfigExample ? (
          <>
            <strong>work area</strong>
            <div style={{ marginTop: "8px", border: "2px solid #111", padding: "8px", background: "#fff" }}>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>File Uploader Module Overview (Summary)</div>
              <div>The work area is the primary interaction point and has two core functions: upload documents, then preview uploaded documents.</div>
              <div style={{ marginTop: "6px" }}>The upload surface is a large centered dashed drop zone with upload icon, plus a [Choose Files] action.</div>
              <div>It sits between the left navigation and right configuration pane as the first workflow step.</div>
              <div style={{ marginTop: "6px" }}>Sample use cases shown under the drop zone: Timetable, Scientific Paper, Charts and Diagrams.</div>
            </div>
            <div style={{ marginTop: "8px", border: "1px solid #333", padding: "8px", background: "#fff" }}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Current State + Inputs + Constraints</div>
              <div>State: empty/idle with "No file chosen".</div>
              <div>Input methods: drag-and-drop or file browser.</div>
              <div>Limits: up to 20 files, 315 MB total.</div>
              <div>Supported formats include documents, slides, spreadsheets, and images.</div>
              <div style={{ marginTop: "6px" }}>Right pane context (applies to uploaded files): Basic/Advanced mode, tier selection, and job options.</div>
            </div>
            <div style={{ marginTop: "8px", border: "1px dashed #444", minHeight: "120px", padding: "8px", background: "#fff" }}>
              Work area has exactly two functions: document upload and uploaded document preview.
            </div>
            <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ border: "1px solid #333", padding: "8px", background: "#fff" }}>
                <strong>Upload area</strong>
                <div>Drop zone + file picker for source documents.</div>
              </div>
              <div style={{ border: "1px solid #333", padding: "8px", background: "#fff" }}>
                <strong>Preview area</strong>
                <div>Rendered preview of uploaded documents.</div>
              </div>
            </div>
          </>
        ) : isCanvasV2 ? (
          <>
            <strong>work area</strong>
            <div style={{ marginTop: "8px", border: "1px dashed #444", minHeight: "120px", padding: "8px", background: "#fff" }}>
              Work area has exactly two functions: document upload and uploaded document preview.
            </div>
            <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ border: "1px solid #333", padding: "8px", background: "#fff" }}>
                <strong>Upload area</strong>
                <div>Drop zone + file picker for source documents.</div>
              </div>
              <div style={{ border: "1px solid #333", padding: "8px", background: "#fff" }}>
                <strong>Preview area</strong>
                <div>Rendered preview of uploaded documents.</div>
              </div>
            </div>
          </>
        ) : (
          "work area"
        )}
      </div>
      {!isTablePlayground && !isReactFlowPlayground && configVisible ? (
        <div
          role="separator"
          aria-label="Resize config pane"
          onPointerDown={startResize("config")}
          onDoubleClick={() => {
            setConfigVisible(true);
            setConfigWidth(defaultConfigWidth);
          }}
          style={{
            gridColumn: configHandleCol ?? undefined,
            gridRow: "2",
            width: "10px",
            cursor: "col-resize",
            borderLeft: `1px solid ${paneLineColor}`,
            borderRight: `1px solid ${paneLineColor}`,
            background: "#ffffff",
          }}
        />
      ) : null}
      {!isTablePlayground && !isReactFlowPlayground && configVisible ? (
        <div style={{ ...boxBase, gridColumn: configCol ?? undefined, gridRow: "2", minWidth: 0, minHeight: 0, background: "#f2f2f2", display: "flex", flexDirection: "column", gap: "8px" }}>
          {isConfigExample ? (
            <>
              <strong>config pane {Math.round(configWidth)}px</strong>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
                Assistant/config inspector pane. Final controls here will be generated from our internal parser configuration schema and enabled extenders.
              </div>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
                <div style={{ fontWeight: 600 }}>Tiers</div>
                <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  <button type="button">Fast</button>
                  <button type="button">Cost Effective</button>
                  <button type="button">Agentic</button>
                </div>
              </div>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span>Cost Optimizer</span>
                  <button type="button">off/on</button>
                </div>
              </div>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
                <div style={{ fontWeight: 600 }}>Page Ranges</div>
                <input type="text" value="e.g. 1-5, 8, 11-13" readOnly style={{ marginTop: "6px", width: "100%" }} />
                <input type="text" value="max pages e.g. 100" readOnly style={{ marginTop: "6px", width: "100%" }} />
              </div>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
                <div style={{ fontWeight: 600 }}>Output</div>
                <select style={{ marginTop: "6px", width: "100%" }} defaultValue="markdown">
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <button type="button" style={{ alignSelf: "flex-end", fontWeight: 600 }}>
                Run Parse
              </button>
            </>
          ) : isCanvasV2 ? (
            <>
              <strong>config pane {Math.round(configWidth)}px</strong>
              <div style={{ border: "1px solid #333", background: "#fff", padding: "8px", marginTop: "8px" }}>
                <div>Assistant/config inspector pane.</div>
                <div>Sections: tier, page ranges, output mode, job options.</div>
                <div>Primary action: run job from this pane.</div>
              </div>
            </>
          ) : (
            <>config pane {Math.round(configWidth)}px</>
          )}
        </div>
      ) : null}
      {aiMode === "open" ? (
        <div
          role="separator"
          aria-label="Resize AI pane"
          onPointerDown={startResize("ai")}
          onDoubleClick={() => {
            setAiMode("open");
            setAiWidth(defaultAiWidth);
          }}
          style={{
            gridColumn: aiHandleCol ?? undefined,
            gridRow: "2",
            width: "10px",
            cursor: "col-resize",
            borderLeft: `1px solid ${paneLineColor}`,
            borderRight: `1px solid ${paneLineColor}`,
            background: "#ffffff",
          }}
        />
      ) : null}
      {aiMode === "open" ? (
        <div
          style={{
            ...boxBase,
            gridColumn: aiCol,
            gridRow: "2",
            minWidth: 0,
            minHeight: 0,
            background: "#efefef",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <strong>global ai assistant pane {Math.round(aiWidth)}px</strong>
          <div style={{ border: "1px solid #333", background: "#fff", padding: "8px" }}>
            Global. Platform AI Assistant Area.
            <div style={{ marginTop: "6px" }}>
              Pull out: click AI tab. Pull in: close to tab. Drag divider inward to snap into thin tab at 80px threshold.
            </div>
          </div>
          <div style={{ border: "1px dashed #444", minHeight: "120px", padding: "8px", background: "#fff" }}>
            chat messages area
          </div>
          <button type="button" onClick={() => setAiMode("closed")} style={{ alignSelf: "flex-start", fontSize: "11px" }}>
            close to tab
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAiMode("open")}
          style={{
            ...boxBase,
            gridColumn: aiCol,
            gridRow: "2",
            minWidth: 0,
            minHeight: 0,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            cursor: "pointer",
            background: "#ececec",
          }}
        >
          ai tab {dims.aiTab}px (click to pull out)
        </button>
      )}
    </div>
  );
}

function SessionIsolatedPage({
  route,
  layoutsBase,
}: {
  route: SessionRoute;
  layoutsBase: string;
}) {
  const content = sessionPageText(route);
  const isV2Route =
    route.endsWith("-v2") || sessionSetV2.some((item) => item.key === route);
  const setOneValue = sessionSetOne.some((item) => item.key === route) ? route : "";
  const setTwoValue = sessionSetTwo.some((item) => item.key === route) ? route : "";
  const setV2Value = sessionSetV2.some((item) => item.key === route) ? route : "";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#111111",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <main style={{ flex: 1, overflow: "auto", padding: "20px 20px 30px 20px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 600 }}>{content.title}</h1>
        {content.text ? <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4 }}>{content.text}</p> : null}
        <div style={{ marginTop: "12px", height: "calc(100% - 32px)", minHeight: "440px" }}>
          {isV2Route ? <SessionWireframeV2 route={route} /> : null}
        </div>
      </main>

      <nav
        aria-label="Session links"
        style={{
          height: "24px",
          borderTop: "1px solid currentColor",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 8px",
          fontSize: "12px",
          whiteSpace: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          pages-1
          <select
            value={setOneValue}
            onChange={(event) => {
              const selectedRoute = event.currentTarget.value;
              if (!selectedRoute) return;
              window.location.href = `${layoutsBase}${selectedRoute}/`;
            }}
            style={{ height: "18px", fontSize: "12px", border: "1px solid currentColor", background: "#ffffff", color: "inherit" }}
          >
            <option value="">select</option>
            {sessionSetOne.map((item) => (
              <option key={item.key} value={item.hrefSuffix.replace("/", "")}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          pages-2
          <select
            value={setTwoValue}
            onChange={(event) => {
              const selectedRoute = event.currentTarget.value;
              if (!selectedRoute) return;
              window.location.href = `${layoutsBase}${selectedRoute}/`;
            }}
            style={{ height: "18px", fontSize: "12px", border: "1px solid currentColor", background: "#ffffff", color: "inherit" }}
          >
            <option value="">select</option>
            {sessionSetTwo.map((item) => (
              <option key={item.key} value={item.hrefSuffix.replace("/", "")}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          pages-v2
          <select
            value={setV2Value}
            onChange={(event) => {
              const selectedRoute = event.currentTarget.value;
              if (!selectedRoute) return;
              window.location.href = `${layoutsBase}${selectedRoute}/`;
            }}
            style={{ height: "18px", fontSize: "12px", border: "1px solid currentColor", background: "#ffffff", color: "inherit" }}
          >
            <option value="">select</option>
            {sessionSetV2.map((item) => (
              <option key={item.key} value={item.hrefSuffix.replace("/", "")}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </div>
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

  const sessionRoute = resolveSessionRoute(normalizedNoDocs);
  if (sessionRoute) {
    return <SessionIsolatedPage route={sessionRoute} layoutsBase={layoutsBase} />;
  }

  if (normalizedNoDocs === "/frontend/layouts/" || normalizedNoDocs === "/") {
    return <WireframeIndex layoutsBase={layoutsBase} />;
  }

  return <NotFound layoutsBase={layoutsBase} />;
}

export default App;

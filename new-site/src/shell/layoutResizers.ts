const DRAG_THRESHOLD_PX = 3;
const SNAP_COLLAPSE_PX = 60;

export function initLayoutResizers(root: HTMLElement): void {
  const navHandle = root.querySelector('[data-handle="nav"]');
  const aiHandle = root.querySelector('[data-handle="ai"]');
  if (!(navHandle instanceof HTMLElement) || !(aiHandle instanceof HTMLElement)) return;

  const navDefault = Number.parseFloat(root.dataset.navDefault || "280");
  const navMin = Number.parseFloat(root.dataset.navMin || "240");
  const navMax = Number.parseFloat(root.dataset.navMax || "420");
  const aiDefault = Number.parseFloat(root.dataset.aiDefault || "360");
  const aiMin = Number.parseFloat(root.dataset.aiMin || "320");
  const aiMax = Number.parseFloat(root.dataset.aiMax || "460");
  const navKey = root.dataset.navStorageKey || "pm-trackb-nav-width-v1";
  const aiKey = root.dataset.aiStorageKey || "pm-trackb-ai-width-v1";

  const readVarPx = (name: string) =>
    Number.parseFloat(getComputedStyle(root).getPropertyValue(name));
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const setPanelWidths = (navWidth: number, aiWidth: number) => {
    const nav = clamp(navWidth, navMin, navMax);
    const ai = clamp(aiWidth, aiMin, aiMax);
    root.style.setProperty("--pane-nav-width", `${nav}px`);
    root.style.setProperty("--pane-ai-width", `${ai}px`);
    navHandle.setAttribute("aria-valuenow", String(Math.round(nav)));
    aiHandle.setAttribute("aria-valuenow", String(Math.round(ai)));
  };

  const persistWidths = () => {
    try {
      localStorage.setItem(navKey, String(readVarPx("--pane-nav-width")));
      if (root.dataset.aiMode === "collapsed-line") {
        localStorage.setItem(aiKey, "collapsed");
      } else {
        localStorage.setItem(aiKey, String(readVarPx("--pane-ai-width")));
      }
    } catch {
      // ignore storage errors in prototype mode
    }
  };

  const hydrateWidths = () => {
    try {
      const storedNav = Number.parseFloat(localStorage.getItem(navKey) ?? "");
      const storedAiRaw = localStorage.getItem(aiKey);
      const navWidth = Number.isFinite(storedNav) ? storedNav : navDefault;

      if (storedAiRaw === "collapsed") {
        root.dataset.aiMode = "collapsed-line";
        setPanelWidths(navWidth, aiDefault);
        return;
      }

      const storedAi = Number.parseFloat(storedAiRaw ?? "");
      const hasStoredAi = Number.isFinite(storedAi);
      const aiWidth = hasStoredAi ? storedAi : aiDefault;
      if (hasStoredAi) {
        root.dataset.aiMode = "expanded";
      }
      setPanelWidths(navWidth, aiWidth);
    } catch {
      setPanelWidths(navDefault, aiDefault);
    }
  };

  const bindDrag = (handle: HTMLElement, mode: "nav" | "ai") => {
    handle.setAttribute("aria-valuemin", String(mode === "nav" ? navMin : aiMin));
    handle.setAttribute("aria-valuemax", String(mode === "nav" ? navMax : aiMax));

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.classList.remove("is-dragging");

      const startX = event.clientX;
      const navStart = readVarPx("--pane-nav-width");
      const startedCollapsed = mode === "ai" && root.dataset.aiMode === "collapsed-line";
      const aiStartRaw = readVarPx("--pane-ai-width");
      const aiStart =
        startedCollapsed ? 0 : Number.isFinite(aiStartRaw) && aiStartRaw > 0 ? aiStartRaw : aiDefault;

      let engaged = false;
      let lastAiCandidate = aiStart;

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        if (!engaged && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
        if (!engaged) {
          engaged = true;
          handle.classList.add("is-dragging");
          if (startedCollapsed) {
            root.dataset.aiMode = "expanded";
            root.style.setProperty("--assistant-track", "0px");
            root.style.setProperty("--pane-ai-width", "0px");
            root.dataset.aiDragging = "true";
          }
        }

        if (mode === "nav") {
          setPanelWidths(navStart + delta, readVarPx("--pane-ai-width") || aiDefault);
          return;
        }

        lastAiCandidate = aiStart - delta;
        if (lastAiCandidate < aiMin) {
          const width = Math.max(0, lastAiCandidate);
          root.style.setProperty("--assistant-track", `${width}px`);
          root.style.setProperty("--pane-ai-width", `${width}px`);
          return;
        }

        root.style.removeProperty("--assistant-track");
        setPanelWidths(navStart, lastAiCandidate);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        handle.classList.remove("is-dragging");
        root.style.removeProperty("--assistant-track");
        if (startedCollapsed) {
          delete root.dataset.aiDragging;
        }

        if (engaged && mode === "ai") {
          if (startedCollapsed) {
            if (lastAiCandidate >= aiMin) {
              setPanelWidths(navStart, lastAiCandidate);
            } else if (lastAiCandidate >= SNAP_COLLAPSE_PX) {
              setPanelWidths(navStart, aiMin);
            } else {
              root.dataset.aiMode = "collapsed-line";
            }
          } else if (lastAiCandidate >= aiMin) {
            setPanelWidths(navStart, lastAiCandidate);
          } else {
            // If user drags inward past minimum while expanded, treat it as intent to collapse.
            root.dataset.aiMode = "collapsed-line";
          }
          persistWidths();
          return;
        }

        if (engaged) {
          persistWidths();
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    });

    handle.addEventListener("dblclick", () => {
      if (mode === "nav") {
        setPanelWidths(navDefault, readVarPx("--pane-ai-width"));
      } else if (root.dataset.aiMode === "collapsed-line") {
        root.dataset.aiMode = "expanded";
        setPanelWidths(readVarPx("--pane-nav-width"), aiDefault);
      } else {
        root.dataset.aiMode = "collapsed-line";
        try {
          localStorage.setItem(aiKey, "collapsed");
        } catch {
          // ignore storage errors in prototype mode
        }
        return;
      }
      persistWidths();
    });

    handle.addEventListener("keydown", (event) => {
      if (!(event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
      event.preventDefault();

      if (mode === "ai" && root.dataset.aiMode === "collapsed-line") {
        root.dataset.aiMode = "expanded";
      }

      const step = event.shiftKey ? 24 : 8;
      const navNow = readVarPx("--pane-nav-width");
      const aiNow = readVarPx("--pane-ai-width");

      if (mode === "nav") {
        const delta = event.key === "ArrowRight" ? step : -step;
        setPanelWidths(navNow + delta, aiNow);
      } else {
        const delta = event.key === "ArrowRight" ? -step : step;
        setPanelWidths(navNow, aiNow + delta);
      }
      persistWidths();
    });
  };

  hydrateWidths();
  bindDrag(navHandle, "nav");
  bindDrag(aiHandle, "ai");
}

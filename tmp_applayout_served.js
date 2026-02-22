import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/AppLayout.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=5b3e4dfb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=5b3e4dfb"; const useEffect = __vite__cjsImport1_react["useEffect"];
import {
  AppShell,
  Box,
  Modal,
  Portal,
  rem,
  useMantineColorScheme,
  useComputedColorScheme
} from "/node_modules/.vite/deps/@mantine_core.js?v=5b3e4dfb";
import { useDisclosure, useLocalStorage } from "/node_modules/.vite/deps/@mantine_hooks.js?v=5b3e4dfb";
import { Outlet, useLocation, useNavigate } from "/node_modules/.vite/deps/react-router-dom.js?v=5b3e4dfb";
import { useAuth } from "/src/auth/AuthContext.tsx";
import { TopCommandBar } from "/src/components/shell/TopCommandBar.tsx?t=1771704911115";
import { LeftRail } from "/src/components/shell/LeftRail.tsx";
import { HeaderCenterProvider } from "/src/components/shell/HeaderCenterContext.tsx";
import { AssistantDockHost } from "/src/components/shell/AssistantDockHost.tsx";
import { AppPageShell } from "/src/components/layout/AppPageShell.tsx";
import { featureFlags } from "/src/lib/featureFlags.ts";
import { styleTokens } from "/src/lib/styleTokens.ts";
export function AppLayout() {
  _s();
  const shellV2Enabled = featureFlags.shellV2;
  const assistantDockEnabled = shellV2Enabled && featureFlags.assistantDock;
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();
  const [desktopNavOpened, setDesktopNavOpened] = useLocalStorage({
    key: "blockdata.shell.nav_open_desktop",
    defaultValue: true
  });
  const [assistantOpened, setAssistantOpened] = useLocalStorage({
    key: "blockdata.shell.assistant_open",
    defaultValue: false
  });
  const [assistantDetached, setAssistantDetached] = useLocalStorage({
    key: "blockdata.shell.assistant_detached",
    defaultValue: false
  });
  const [assistantSide, setAssistantSide] = useLocalStorage({
    key: "blockdata.shell.assistant_side",
    defaultValue: "right"
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark");
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  };
  const toggleAssistant = () => {
    if (assistantOpened) {
      setAssistantOpened(false);
      setAssistantDetached(false);
      return;
    }
    setAssistantOpened(true);
  };
  const closeAssistant = () => {
    setAssistantOpened(false);
    setAssistantDetached(false);
  };
  const toggleAssistantDetached = () => {
    if (!assistantOpened) {
      setAssistantOpened(true);
    }
    setAssistantDetached(!assistantDetached);
  };
  const toggleAssistantSide = () => {
    setAssistantSide(assistantSide === "right" ? "left" : "right");
  };
  const toggleDesktopNav = () => setDesktopNavOpened(!desktopNavOpened);
  const desktopNavbarWidth = desktopNavOpened ? styleTokens.shell.navbarWidth : styleTokens.shell.navbarCompactWidth;
  const isProjectCanvasRoute = /^\/app\/projects\/[^/]+$/.test(location.pathname);
  const isExtractCanvasRoute = /^\/app\/extract\/[^/]+$/.test(location.pathname);
  const isTransformCanvasRoute = /^\/app\/transform\/[^/]+$/.test(location.pathname);
  const isSchemaLayoutRoute = location.pathname === "/app/schemas/layout";
  const lockMainScroll = isProjectCanvasRoute || isExtractCanvasRoute || isTransformCanvasRoute || isSchemaLayoutRoute;
  useEffect(() => {
    if (!lockMainScroll) return void 0;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, [lockMainScroll]);
  const lockedMainStyle = lockMainScroll ? {
    overflow: "hidden",
    overscrollBehavior: "none"
  } : void 0;
  return /* @__PURE__ */ jsxDEV(HeaderCenterProvider, { children: [
    /* @__PURE__ */ jsxDEV(
      AppShell,
      {
        header: { height: styleTokens.shell.headerHeight },
        navbar: {
          width: { base: styleTokens.shell.navbarWidth, sm: desktopNavbarWidth },
          breakpoint: "sm",
          collapsed: { mobile: !navOpened, desktop: false }
        },
        padding: styleTokens.shell.mainPadding,
        styles: {
          header: {
            boxShadow: "none"
          },
          navbar: {
            backgroundColor: "var(--mantine-color-body)",
            borderRight: "1px solid var(--mantine-color-default-border)",
            top: 0,
            height: "100dvh"
          }
        },
        children: [
          /* @__PURE__ */ jsxDEV(AppShell.Header, { children: /* @__PURE__ */ jsxDEV(
            TopCommandBar,
            {
              navOpened,
              onToggleNav: toggleNav,
              desktopNavOpened,
              onToggleDesktopNav: toggleDesktopNav,
              showAssistantToggle: assistantDockEnabled,
              assistantOpened,
              onToggleAssistant: toggleAssistant,
              computedColorScheme,
              onToggleColorScheme: toggleColorScheme
            },
            void 0,
            false,
            {
              fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
              lineNumber: 142,
              columnNumber: 9
            },
            this
          ) }, void 0, false, {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 141,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV(
            AppShell.Navbar,
            {
              px: 0,
              pb: 0,
              pt: 0,
              children: /* @__PURE__ */ jsxDEV(
                LeftRail,
                {
                  onNavigate: () => {
                    closeNav();
                  },
                  userLabel: profile?.display_name || profile?.email || user?.email,
                  onSignOut: handleSignOut,
                  desktopCompact: !desktopNavOpened,
                  onToggleDesktopCompact: toggleDesktopNav
                },
                void 0,
                false,
                {
                  fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
                  lineNumber: 160,
                  columnNumber: 9
                },
                this
              )
            },
            void 0,
            false,
            {
              fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
              lineNumber: 155,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(AppShell.Main, { style: lockedMainStyle, children: /* @__PURE__ */ jsxDEV(AppPageShell, { mode: "fluid", children: /* @__PURE__ */ jsxDEV(Outlet, {}, void 0, false, {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 173,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 172,
            columnNumber: 9
          }, this) }, void 0, false, {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 171,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
        lineNumber: 121,
        columnNumber: 5
      },
      this
    ),
    assistantDockEnabled && assistantOpened && !assistantDetached && /* @__PURE__ */ jsxDEV(Portal, { children: /* @__PURE__ */ jsxDEV(
      Box,
      {
        style: {
          position: "fixed",
          zIndex: 340,
          bottom: rem(12),
          left: assistantSide === "left" ? rem(12) : void 0,
          right: assistantSide === "right" ? rem(12) : void 0,
          width: "min(560px, calc(100vw - 24px))",
          height: "min(78vh, 860px)",
          borderRadius: rem(12),
          border: "1px solid rgba(148, 163, 184, 0.28)",
          backgroundColor: "#29313c",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.34)"
        },
        children: /* @__PURE__ */ jsxDEV(
          AssistantDockHost,
          {
            onClose: closeAssistant,
            onDetach: toggleAssistantDetached,
            onToggleSide: toggleAssistantSide,
            side: assistantSide
          },
          void 0,
          false,
          {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 197,
            columnNumber: 11
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
        lineNumber: 181,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
      lineNumber: 180,
      columnNumber: 7
    }, this),
    assistantDockEnabled && /* @__PURE__ */ jsxDEV(
      Modal,
      {
        opened: assistantOpened && assistantDetached,
        onClose: closeAssistant,
        withCloseButton: false,
        centered: true,
        size: "min(1180px, 96vw)",
        yOffset: "2vh",
        overlayProps: { backgroundOpacity: 0.32, blur: 2 },
        styles: {
          content: {
            border: "1px solid rgba(148, 163, 184, 0.28)",
            backgroundColor: "#29313c",
            overflow: "hidden"
          },
          body: {
            padding: 0
          }
        },
        children: /* @__PURE__ */ jsxDEV(
          AssistantDockHost,
          {
            onClose: closeAssistant,
            onDetach: toggleAssistantDetached,
            detached: true
          },
          void 0,
          false,
          {
            fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
            lineNumber: 227,
            columnNumber: 9
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
        lineNumber: 208,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "E:/writing-system/web/src/components/layout/AppLayout.tsx",
    lineNumber: 120,
    columnNumber: 5
  }, this);
}
_s(AppLayout, "QjwbJdSQEHxPcF8XSMkznpIGDV8=", false, function() {
  return [useDisclosure, useLocalStorage, useLocalStorage, useLocalStorage, useLocalStorage, useNavigate, useLocation, useAuth, useMantineColorScheme, useComputedColorScheme];
});
_c = AppLayout;
var _c;
$RefreshReg$(_c, "AppLayout");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("E:/writing-system/web/src/components/layout/AppLayout.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("E:/writing-system/web/src/components/layout/AppLayout.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "E:/writing-system/web/src/components/layout/AppLayout.tsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBNklROztBQTdJUixTQUFTQSxpQkFBaUI7QUFDMUI7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1AsU0FBU0MsZUFBZUMsdUJBQXVCO0FBQy9DLFNBQVNDLFFBQVFDLGFBQWFDLG1CQUFtQjtBQUNqRCxTQUFTQyxlQUFlO0FBQ3hCLFNBQVNDLHFCQUFxQjtBQUM5QixTQUFTQyxnQkFBZ0I7QUFDekIsU0FBU0MsNEJBQTRCO0FBQ3JDLFNBQVNDLHlCQUF5QjtBQUNsQyxTQUFTQyxvQkFBb0I7QUFDN0IsU0FBU0Msb0JBQW9CO0FBQzdCLFNBQVNDLG1CQUFtQjtBQUVyQixnQkFBU0MsWUFBWTtBQUFBQyxLQUFBO0FBQzFCLFFBQU1DLGlCQUFpQkosYUFBYUs7QUFDcEMsUUFBTUMsdUJBQXVCRixrQkFBa0JKLGFBQWFPO0FBQzVELFFBQU0sQ0FBQ0MsV0FBVyxFQUFFQyxRQUFRQyxXQUFXQyxPQUFPQyxTQUFTLENBQUMsSUFBSXZCLGNBQWM7QUFDMUUsUUFBTSxDQUFDd0Isa0JBQWtCQyxtQkFBbUIsSUFBSXhCLGdCQUF5QjtBQUFBLElBQ3ZFeUIsS0FBSztBQUFBLElBQ0xDLGNBQWM7QUFBQSxFQUNoQixDQUFDO0FBQ0QsUUFBTSxDQUFDQyxpQkFBaUJDLGtCQUFrQixJQUFJNUIsZ0JBQXlCO0FBQUEsSUFDckV5QixLQUFLO0FBQUEsSUFDTEMsY0FBYztBQUFBLEVBQ2hCLENBQUM7QUFDRCxRQUFNLENBQUNHLG1CQUFtQkMsb0JBQW9CLElBQUk5QixnQkFBeUI7QUFBQSxJQUN6RXlCLEtBQUs7QUFBQSxJQUNMQyxjQUFjO0FBQUEsRUFDaEIsQ0FBQztBQUNELFFBQU0sQ0FBQ0ssZUFBZUMsZ0JBQWdCLElBQUloQyxnQkFBa0M7QUFBQSxJQUMxRXlCLEtBQUs7QUFBQSxJQUNMQyxjQUFjO0FBQUEsRUFDaEIsQ0FBQztBQUNELFFBQU1PLFdBQVc5QixZQUFZO0FBQzdCLFFBQU0rQixXQUFXaEMsWUFBWTtBQUM3QixRQUFNLEVBQUVpQyxNQUFNQyxTQUFTQyxRQUFRLElBQUlqQyxRQUFRO0FBQzNDLFFBQU0sRUFBRWtDLGVBQWUsSUFBSXpDLHNCQUFzQjtBQUNqRCxRQUFNMEMsc0JBQXNCekMsdUJBQXVCLE1BQU07QUFFekQsUUFBTTBDLGdCQUFnQixZQUFZO0FBQ2hDLFVBQU1ILFFBQVE7QUFDZEosYUFBUyxRQUFRO0FBQUEsRUFDbkI7QUFFQSxRQUFNUSxvQkFBb0JBLE1BQU07QUFDOUJILG1CQUFlQyx3QkFBd0IsU0FBUyxVQUFVLE1BQU07QUFBQSxFQUNsRTtBQUVBLFFBQU1HLGtCQUFrQkEsTUFBTTtBQUM1QixRQUFJZixpQkFBaUI7QUFDbkJDLHlCQUFtQixLQUFLO0FBQ3hCRSwyQkFBcUIsS0FBSztBQUMxQjtBQUFBLElBQ0Y7QUFDQUYsdUJBQW1CLElBQUk7QUFBQSxFQUN6QjtBQUNBLFFBQU1lLGlCQUFpQkEsTUFBTTtBQUMzQmYsdUJBQW1CLEtBQUs7QUFDeEJFLHlCQUFxQixLQUFLO0FBQUEsRUFDNUI7QUFDQSxRQUFNYywwQkFBMEJBLE1BQU07QUFDcEMsUUFBSSxDQUFDakIsaUJBQWlCO0FBQ3BCQyx5QkFBbUIsSUFBSTtBQUFBLElBQ3pCO0FBQ0FFLHlCQUFxQixDQUFDRCxpQkFBaUI7QUFBQSxFQUN6QztBQUNBLFFBQU1nQixzQkFBc0JBLE1BQU07QUFDaENiLHFCQUFpQkQsa0JBQWtCLFVBQVUsU0FBUyxPQUFPO0FBQUEsRUFDL0Q7QUFDQSxRQUFNZSxtQkFBbUJBLE1BQU10QixvQkFBb0IsQ0FBQ0QsZ0JBQWdCO0FBQ3BFLFFBQU13QixxQkFBcUJ4QixtQkFDdkJaLFlBQVlxQyxNQUFNQyxjQUNsQnRDLFlBQVlxQyxNQUFNRTtBQUV0QixRQUFNQyx1QkFBdUIsMkJBQTJCQyxLQUFLbEIsU0FBU21CLFFBQVE7QUFDOUUsUUFBTUMsdUJBQXVCLDBCQUEwQkYsS0FBS2xCLFNBQVNtQixRQUFRO0FBQzdFLFFBQU1FLHlCQUF5Qiw0QkFBNEJILEtBQUtsQixTQUFTbUIsUUFBUTtBQUNqRixRQUFNRyxzQkFBc0J0QixTQUFTbUIsYUFBYTtBQUNsRCxRQUFNSSxpQkFDSk4sd0JBQ0dHLHdCQUNBQywwQkFDQUM7QUFHTGpFLFlBQVUsTUFBTTtBQUNkLFFBQUksQ0FBQ2tFLGVBQWdCLFFBQU9DO0FBRTVCLFVBQU1DLHVCQUF1QkMsU0FBU0MsZ0JBQWdCQyxNQUFNQztBQUM1RCxVQUFNQyx1QkFBdUJKLFNBQVNLLEtBQUtILE1BQU1DO0FBQ2pELFVBQU1HLGlDQUFpQ04sU0FBU0ssS0FBS0gsTUFBTUs7QUFFM0RQLGFBQVNDLGdCQUFnQkMsTUFBTUMsV0FBVztBQUMxQ0gsYUFBU0ssS0FBS0gsTUFBTUMsV0FBVztBQUMvQkgsYUFBU0ssS0FBS0gsTUFBTUsscUJBQXFCO0FBRXpDLFdBQU8sTUFBTTtBQUNYUCxlQUFTQyxnQkFBZ0JDLE1BQU1DLFdBQVdKO0FBQzFDQyxlQUFTSyxLQUFLSCxNQUFNQyxXQUFXQztBQUMvQkosZUFBU0ssS0FBS0gsTUFBTUsscUJBQXFCRDtBQUFBQSxJQUMzQztBQUFBLEVBQ0YsR0FBRyxDQUFDVCxjQUFjLENBQUM7QUFFbkIsUUFBTVcsa0JBQWtCWCxpQkFDcEI7QUFBQSxJQUNFTSxVQUFVO0FBQUEsSUFDVkksb0JBQW9CO0FBQUEsRUFDdEIsSUFDQVQ7QUFFSixTQUNFLHVCQUFDLHdCQUNEO0FBQUE7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLFFBQVEsRUFBRVcsUUFBUTFELFlBQVlxQyxNQUFNc0IsYUFBYTtBQUFBLFFBQ2pELFFBQVE7QUFBQSxVQUNOQyxPQUFPLEVBQUVDLE1BQU03RCxZQUFZcUMsTUFBTUMsYUFBYXdCLElBQUkxQixtQkFBbUI7QUFBQSxVQUNyRTJCLFlBQVk7QUFBQSxVQUNaQyxXQUFXLEVBQUVDLFFBQVEsQ0FBQzFELFdBQVcyRCxTQUFTLE1BQU07QUFBQSxRQUNsRDtBQUFBLFFBQ0EsU0FBU2xFLFlBQVlxQyxNQUFNOEI7QUFBQUEsUUFDM0IsUUFBUTtBQUFBLFVBQ05DLFFBQVE7QUFBQSxZQUNOQyxXQUFXO0FBQUEsVUFDYjtBQUFBLFVBQ0FDLFFBQVE7QUFBQSxZQUNOQyxpQkFBaUI7QUFBQSxZQUNqQkMsYUFBYTtBQUFBLFlBQ2JDLEtBQUs7QUFBQSxZQUNMZixRQUFRO0FBQUEsVUFDVjtBQUFBLFFBQ0Y7QUFBQSxRQUVBO0FBQUEsaUNBQUMsU0FBUyxRQUFULEVBQ0M7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDO0FBQUEsY0FDQSxhQUFhakQ7QUFBQUEsY0FDYjtBQUFBLGNBQ0Esb0JBQW9CMEI7QUFBQUEsY0FDcEIscUJBQXFCOUI7QUFBQUEsY0FDckI7QUFBQSxjQUNBLG1CQUFtQjBCO0FBQUFBLGNBQ25CO0FBQUEsY0FDQSxxQkFBcUJEO0FBQUFBO0FBQUFBLFlBVHZCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQVN5QyxLQVYzQztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQVlBO0FBQUEsVUFFQTtBQUFBLFlBQUMsU0FBUztBQUFBLFlBQVQ7QUFBQSxjQUNDLElBQUk7QUFBQSxjQUNKLElBQUk7QUFBQSxjQUNKLElBQUk7QUFBQSxjQUVKO0FBQUEsZ0JBQUM7QUFBQTtBQUFBLGtCQUNDLFlBQVksTUFBTTtBQUNoQm5CLDZCQUFTO0FBQUEsa0JBQ1g7QUFBQSxrQkFDQSxXQUFXYyxTQUFTaUQsZ0JBQWdCakQsU0FBU2tELFNBQVNuRCxNQUFNbUQ7QUFBQUEsa0JBQzVELFdBQVc5QztBQUFBQSxrQkFDWCxnQkFBZ0IsQ0FBQ2pCO0FBQUFBLGtCQUNqQix3QkFBd0J1QjtBQUFBQTtBQUFBQSxnQkFQMUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGNBTzJDO0FBQUE7QUFBQSxZQVo3QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFjQTtBQUFBLFVBRUEsdUJBQUMsU0FBUyxNQUFULEVBQWMsT0FBT3NCLGlCQUNwQixpQ0FBQyxnQkFBYSxNQUFLLFNBQ2pCLGlDQUFDLFlBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBTyxLQURUO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUlBO0FBQUE7QUFBQTtBQUFBLE1BdERGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQXdEQTtBQUFBLElBRUNwRCx3QkFBd0JXLG1CQUFtQixDQUFDRSxxQkFDM0MsdUJBQUMsVUFDQztBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsT0FBTztBQUFBLFVBQ0wwRCxVQUFVO0FBQUEsVUFDVkMsUUFBUTtBQUFBLFVBQ1JDLFFBQVE3RixJQUFJLEVBQUU7QUFBQSxVQUNkOEYsTUFBTTNELGtCQUFrQixTQUFTbkMsSUFBSSxFQUFFLElBQUk4RDtBQUFBQSxVQUMzQ2lDLE9BQU81RCxrQkFBa0IsVUFBVW5DLElBQUksRUFBRSxJQUFJOEQ7QUFBQUEsVUFDN0NhLE9BQU87QUFBQSxVQUNQRixRQUFRO0FBQUEsVUFDUnVCLGNBQWNoRyxJQUFJLEVBQUU7QUFBQSxVQUNwQmlHLFFBQVE7QUFBQSxVQUNSWCxpQkFBaUI7QUFBQSxVQUNqQm5CLFVBQVU7QUFBQSxVQUNWaUIsV0FBVztBQUFBLFFBQ2I7QUFBQSxRQUVBO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDQyxTQUFTckM7QUFBQUEsWUFDVCxVQUFVQztBQUFBQSxZQUNWLGNBQWNDO0FBQUFBLFlBQ2QsTUFBTWQ7QUFBQUE7QUFBQUEsVUFKUjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJc0I7QUFBQTtBQUFBLE1BcEJ4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFzQkEsS0F2QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXdCQTtBQUFBLElBR0RmLHdCQUNDO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxRQUFRVyxtQkFBbUJFO0FBQUFBLFFBQzNCLFNBQVNjO0FBQUFBLFFBQ1QsaUJBQWlCO0FBQUEsUUFDakI7QUFBQSxRQUNBLE1BQUs7QUFBQSxRQUNMLFNBQVE7QUFBQSxRQUNSLGNBQWMsRUFBRW1ELG1CQUFtQixNQUFNQyxNQUFNLEVBQUU7QUFBQSxRQUNqRCxRQUFRO0FBQUEsVUFDTkMsU0FBUztBQUFBLFlBQ1BILFFBQVE7QUFBQSxZQUNSWCxpQkFBaUI7QUFBQSxZQUNqQm5CLFVBQVU7QUFBQSxVQUNaO0FBQUEsVUFDQUUsTUFBTTtBQUFBLFlBQ0pnQyxTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxRQUVBO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDQyxTQUFTdEQ7QUFBQUEsWUFDVCxVQUFVQztBQUFBQSxZQUNWLFVBQVE7QUFBQTtBQUFBLFVBSFY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBR1U7QUFBQTtBQUFBLE1BdEJaO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQXdCQTtBQUFBLE9BaEhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FtSEE7QUFFSjtBQUFDL0IsR0F2TmVELFdBQVM7QUFBQSxVQUdxQ2IsZUFDWkMsaUJBSUZBLGlCQUlJQSxpQkFJUkEsaUJBSXpCRyxhQUNBRCxhQUNrQkUsU0FDUlAsdUJBQ0NDLHNCQUFzQjtBQUFBO0FBQUEsS0F4QnBDYztBQUFTLElBQUFzRjtBQUFBLGFBQUFBLElBQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJBcHBTaGVsbCIsIkJveCIsIk1vZGFsIiwiUG9ydGFsIiwicmVtIiwidXNlTWFudGluZUNvbG9yU2NoZW1lIiwidXNlQ29tcHV0ZWRDb2xvclNjaGVtZSIsInVzZURpc2Nsb3N1cmUiLCJ1c2VMb2NhbFN0b3JhZ2UiLCJPdXRsZXQiLCJ1c2VMb2NhdGlvbiIsInVzZU5hdmlnYXRlIiwidXNlQXV0aCIsIlRvcENvbW1hbmRCYXIiLCJMZWZ0UmFpbCIsIkhlYWRlckNlbnRlclByb3ZpZGVyIiwiQXNzaXN0YW50RG9ja0hvc3QiLCJBcHBQYWdlU2hlbGwiLCJmZWF0dXJlRmxhZ3MiLCJzdHlsZVRva2VucyIsIkFwcExheW91dCIsIl9zIiwic2hlbGxWMkVuYWJsZWQiLCJzaGVsbFYyIiwiYXNzaXN0YW50RG9ja0VuYWJsZWQiLCJhc3Npc3RhbnREb2NrIiwibmF2T3BlbmVkIiwidG9nZ2xlIiwidG9nZ2xlTmF2IiwiY2xvc2UiLCJjbG9zZU5hdiIsImRlc2t0b3BOYXZPcGVuZWQiLCJzZXREZXNrdG9wTmF2T3BlbmVkIiwia2V5IiwiZGVmYXVsdFZhbHVlIiwiYXNzaXN0YW50T3BlbmVkIiwic2V0QXNzaXN0YW50T3BlbmVkIiwiYXNzaXN0YW50RGV0YWNoZWQiLCJzZXRBc3Npc3RhbnREZXRhY2hlZCIsImFzc2lzdGFudFNpZGUiLCJzZXRBc3Npc3RhbnRTaWRlIiwibmF2aWdhdGUiLCJsb2NhdGlvbiIsInVzZXIiLCJwcm9maWxlIiwic2lnbk91dCIsInNldENvbG9yU2NoZW1lIiwiY29tcHV0ZWRDb2xvclNjaGVtZSIsImhhbmRsZVNpZ25PdXQiLCJ0b2dnbGVDb2xvclNjaGVtZSIsInRvZ2dsZUFzc2lzdGFudCIsImNsb3NlQXNzaXN0YW50IiwidG9nZ2xlQXNzaXN0YW50RGV0YWNoZWQiLCJ0b2dnbGVBc3Npc3RhbnRTaWRlIiwidG9nZ2xlRGVza3RvcE5hdiIsImRlc2t0b3BOYXZiYXJXaWR0aCIsInNoZWxsIiwibmF2YmFyV2lkdGgiLCJuYXZiYXJDb21wYWN0V2lkdGgiLCJpc1Byb2plY3RDYW52YXNSb3V0ZSIsInRlc3QiLCJwYXRobmFtZSIsImlzRXh0cmFjdENhbnZhc1JvdXRlIiwiaXNUcmFuc2Zvcm1DYW52YXNSb3V0ZSIsImlzU2NoZW1hTGF5b3V0Um91dGUiLCJsb2NrTWFpblNjcm9sbCIsInVuZGVmaW5lZCIsInByZXZpb3VzSHRtbE92ZXJmbG93IiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJzdHlsZSIsIm92ZXJmbG93IiwicHJldmlvdXNCb2R5T3ZlcmZsb3ciLCJib2R5IiwicHJldmlvdXNCb2R5T3ZlcnNjcm9sbEJlaGF2aW9yIiwib3ZlcnNjcm9sbEJlaGF2aW9yIiwibG9ja2VkTWFpblN0eWxlIiwiaGVpZ2h0IiwiaGVhZGVySGVpZ2h0Iiwid2lkdGgiLCJiYXNlIiwic20iLCJicmVha3BvaW50IiwiY29sbGFwc2VkIiwibW9iaWxlIiwiZGVza3RvcCIsIm1haW5QYWRkaW5nIiwiaGVhZGVyIiwiYm94U2hhZG93IiwibmF2YmFyIiwiYmFja2dyb3VuZENvbG9yIiwiYm9yZGVyUmlnaHQiLCJ0b3AiLCJkaXNwbGF5X25hbWUiLCJlbWFpbCIsInBvc2l0aW9uIiwiekluZGV4IiwiYm90dG9tIiwibGVmdCIsInJpZ2h0IiwiYm9yZGVyUmFkaXVzIiwiYm9yZGVyIiwiYmFja2dyb3VuZE9wYWNpdHkiLCJibHVyIiwiY29udGVudCIsInBhZGRpbmciLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBcHBMYXlvdXQudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHtcclxuICBBcHBTaGVsbCxcclxuICBCb3gsXHJcbiAgTW9kYWwsXHJcbiAgUG9ydGFsLFxyXG4gIHJlbSxcclxuICB1c2VNYW50aW5lQ29sb3JTY2hlbWUsXHJcbiAgdXNlQ29tcHV0ZWRDb2xvclNjaGVtZSxcclxufSBmcm9tICdAbWFudGluZS9jb3JlJztcclxuaW1wb3J0IHsgdXNlRGlzY2xvc3VyZSwgdXNlTG9jYWxTdG9yYWdlIH0gZnJvbSAnQG1hbnRpbmUvaG9va3MnO1xyXG5pbXBvcnQgeyBPdXRsZXQsIHVzZUxvY2F0aW9uLCB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xyXG5pbXBvcnQgeyB1c2VBdXRoIH0gZnJvbSAnQC9hdXRoL0F1dGhDb250ZXh0JztcclxuaW1wb3J0IHsgVG9wQ29tbWFuZEJhciB9IGZyb20gJ0AvY29tcG9uZW50cy9zaGVsbC9Ub3BDb21tYW5kQmFyJztcclxuaW1wb3J0IHsgTGVmdFJhaWwgfSBmcm9tICdAL2NvbXBvbmVudHMvc2hlbGwvTGVmdFJhaWwnO1xyXG5pbXBvcnQgeyBIZWFkZXJDZW50ZXJQcm92aWRlciB9IGZyb20gJ0AvY29tcG9uZW50cy9zaGVsbC9IZWFkZXJDZW50ZXJDb250ZXh0JztcclxuaW1wb3J0IHsgQXNzaXN0YW50RG9ja0hvc3QgfSBmcm9tICdAL2NvbXBvbmVudHMvc2hlbGwvQXNzaXN0YW50RG9ja0hvc3QnO1xyXG5pbXBvcnQgeyBBcHBQYWdlU2hlbGwgfSBmcm9tICdAL2NvbXBvbmVudHMvbGF5b3V0L0FwcFBhZ2VTaGVsbCc7XHJcbmltcG9ydCB7IGZlYXR1cmVGbGFncyB9IGZyb20gJ0AvbGliL2ZlYXR1cmVGbGFncyc7XHJcbmltcG9ydCB7IHN0eWxlVG9rZW5zIH0gZnJvbSAnQC9saWIvc3R5bGVUb2tlbnMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIEFwcExheW91dCgpIHtcclxuICBjb25zdCBzaGVsbFYyRW5hYmxlZCA9IGZlYXR1cmVGbGFncy5zaGVsbFYyO1xyXG4gIGNvbnN0IGFzc2lzdGFudERvY2tFbmFibGVkID0gc2hlbGxWMkVuYWJsZWQgJiYgZmVhdHVyZUZsYWdzLmFzc2lzdGFudERvY2s7XHJcbiAgY29uc3QgW25hdk9wZW5lZCwgeyB0b2dnbGU6IHRvZ2dsZU5hdiwgY2xvc2U6IGNsb3NlTmF2IH1dID0gdXNlRGlzY2xvc3VyZSgpO1xyXG4gIGNvbnN0IFtkZXNrdG9wTmF2T3BlbmVkLCBzZXREZXNrdG9wTmF2T3BlbmVkXSA9IHVzZUxvY2FsU3RvcmFnZTxib29sZWFuPih7XHJcbiAgICBrZXk6ICdibG9ja2RhdGEuc2hlbGwubmF2X29wZW5fZGVza3RvcCcsXHJcbiAgICBkZWZhdWx0VmFsdWU6IHRydWUsXHJcbiAgfSk7XHJcbiAgY29uc3QgW2Fzc2lzdGFudE9wZW5lZCwgc2V0QXNzaXN0YW50T3BlbmVkXSA9IHVzZUxvY2FsU3RvcmFnZTxib29sZWFuPih7XHJcbiAgICBrZXk6ICdibG9ja2RhdGEuc2hlbGwuYXNzaXN0YW50X29wZW4nLFxyXG4gICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcclxuICB9KTtcclxuICBjb25zdCBbYXNzaXN0YW50RGV0YWNoZWQsIHNldEFzc2lzdGFudERldGFjaGVkXSA9IHVzZUxvY2FsU3RvcmFnZTxib29sZWFuPih7XHJcbiAgICBrZXk6ICdibG9ja2RhdGEuc2hlbGwuYXNzaXN0YW50X2RldGFjaGVkJyxcclxuICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXHJcbiAgfSk7XHJcbiAgY29uc3QgW2Fzc2lzdGFudFNpZGUsIHNldEFzc2lzdGFudFNpZGVdID0gdXNlTG9jYWxTdG9yYWdlPCdsZWZ0JyB8ICdyaWdodCc+KHtcclxuICAgIGtleTogJ2Jsb2NrZGF0YS5zaGVsbC5hc3Npc3RhbnRfc2lkZScsXHJcbiAgICBkZWZhdWx0VmFsdWU6ICdyaWdodCcsXHJcbiAgfSk7XHJcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xyXG4gIGNvbnN0IGxvY2F0aW9uID0gdXNlTG9jYXRpb24oKTtcclxuICBjb25zdCB7IHVzZXIsIHByb2ZpbGUsIHNpZ25PdXQgfSA9IHVzZUF1dGgoKTtcclxuICBjb25zdCB7IHNldENvbG9yU2NoZW1lIH0gPSB1c2VNYW50aW5lQ29sb3JTY2hlbWUoKTtcclxuICBjb25zdCBjb21wdXRlZENvbG9yU2NoZW1lID0gdXNlQ29tcHV0ZWRDb2xvclNjaGVtZSgnZGFyaycpO1xyXG5cclxuICBjb25zdCBoYW5kbGVTaWduT3V0ID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgYXdhaXQgc2lnbk91dCgpO1xyXG4gICAgbmF2aWdhdGUoJy9sb2dpbicpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IHRvZ2dsZUNvbG9yU2NoZW1lID0gKCkgPT4ge1xyXG4gICAgc2V0Q29sb3JTY2hlbWUoY29tcHV0ZWRDb2xvclNjaGVtZSA9PT0gJ2RhcmsnID8gJ2xpZ2h0JyA6ICdkYXJrJyk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdG9nZ2xlQXNzaXN0YW50ID0gKCkgPT4ge1xyXG4gICAgaWYgKGFzc2lzdGFudE9wZW5lZCkge1xyXG4gICAgICBzZXRBc3Npc3RhbnRPcGVuZWQoZmFsc2UpO1xyXG4gICAgICBzZXRBc3Npc3RhbnREZXRhY2hlZChmYWxzZSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHNldEFzc2lzdGFudE9wZW5lZCh0cnVlKTtcclxuICB9O1xyXG4gIGNvbnN0IGNsb3NlQXNzaXN0YW50ID0gKCkgPT4ge1xyXG4gICAgc2V0QXNzaXN0YW50T3BlbmVkKGZhbHNlKTtcclxuICAgIHNldEFzc2lzdGFudERldGFjaGVkKGZhbHNlKTtcclxuICB9O1xyXG4gIGNvbnN0IHRvZ2dsZUFzc2lzdGFudERldGFjaGVkID0gKCkgPT4ge1xyXG4gICAgaWYgKCFhc3Npc3RhbnRPcGVuZWQpIHtcclxuICAgICAgc2V0QXNzaXN0YW50T3BlbmVkKHRydWUpO1xyXG4gICAgfVxyXG4gICAgc2V0QXNzaXN0YW50RGV0YWNoZWQoIWFzc2lzdGFudERldGFjaGVkKTtcclxuICB9O1xyXG4gIGNvbnN0IHRvZ2dsZUFzc2lzdGFudFNpZGUgPSAoKSA9PiB7XHJcbiAgICBzZXRBc3Npc3RhbnRTaWRlKGFzc2lzdGFudFNpZGUgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAncmlnaHQnKTtcclxuICB9O1xyXG4gIGNvbnN0IHRvZ2dsZURlc2t0b3BOYXYgPSAoKSA9PiBzZXREZXNrdG9wTmF2T3BlbmVkKCFkZXNrdG9wTmF2T3BlbmVkKTtcclxuICBjb25zdCBkZXNrdG9wTmF2YmFyV2lkdGggPSBkZXNrdG9wTmF2T3BlbmVkXHJcbiAgICA/IHN0eWxlVG9rZW5zLnNoZWxsLm5hdmJhcldpZHRoXHJcbiAgICA6IHN0eWxlVG9rZW5zLnNoZWxsLm5hdmJhckNvbXBhY3RXaWR0aDtcclxuXHJcbiAgY29uc3QgaXNQcm9qZWN0Q2FudmFzUm91dGUgPSAvXlxcL2FwcFxcL3Byb2plY3RzXFwvW14vXSskLy50ZXN0KGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuICBjb25zdCBpc0V4dHJhY3RDYW52YXNSb3V0ZSA9IC9eXFwvYXBwXFwvZXh0cmFjdFxcL1teL10rJC8udGVzdChsb2NhdGlvbi5wYXRobmFtZSk7XHJcbiAgY29uc3QgaXNUcmFuc2Zvcm1DYW52YXNSb3V0ZSA9IC9eXFwvYXBwXFwvdHJhbnNmb3JtXFwvW14vXSskLy50ZXN0KGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuICBjb25zdCBpc1NjaGVtYUxheW91dFJvdXRlID0gbG9jYXRpb24ucGF0aG5hbWUgPT09ICcvYXBwL3NjaGVtYXMvbGF5b3V0JztcclxuICBjb25zdCBsb2NrTWFpblNjcm9sbCA9IChcclxuICAgIGlzUHJvamVjdENhbnZhc1JvdXRlXHJcbiAgICB8fCBpc0V4dHJhY3RDYW52YXNSb3V0ZVxyXG4gICAgfHwgaXNUcmFuc2Zvcm1DYW52YXNSb3V0ZVxyXG4gICAgfHwgaXNTY2hlbWFMYXlvdXRSb3V0ZVxyXG4gICk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBpZiAoIWxvY2tNYWluU2Nyb2xsKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0IHByZXZpb3VzSHRtbE92ZXJmbG93ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93O1xyXG4gICAgY29uc3QgcHJldmlvdXNCb2R5T3ZlcmZsb3cgPSBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93O1xyXG4gICAgY29uc3QgcHJldmlvdXNCb2R5T3ZlcnNjcm9sbEJlaGF2aW9yID0gZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyc2Nyb2xsQmVoYXZpb3I7XHJcblxyXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJzY3JvbGxCZWhhdmlvciA9ICdub25lJztcclxuXHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSBwcmV2aW91c0h0bWxPdmVyZmxvdztcclxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9IHByZXZpb3VzQm9keU92ZXJmbG93O1xyXG4gICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJzY3JvbGxCZWhhdmlvciA9IHByZXZpb3VzQm9keU92ZXJzY3JvbGxCZWhhdmlvcjtcclxuICAgIH07XHJcbiAgfSwgW2xvY2tNYWluU2Nyb2xsXSk7XHJcblxyXG4gIGNvbnN0IGxvY2tlZE1haW5TdHlsZSA9IGxvY2tNYWluU2Nyb2xsXHJcbiAgICA/IHtcclxuICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicgYXMgY29uc3QsXHJcbiAgICAgICAgb3ZlcnNjcm9sbEJlaGF2aW9yOiAnbm9uZScgYXMgY29uc3QsXHJcbiAgICAgIH1cclxuICAgIDogdW5kZWZpbmVkO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPEhlYWRlckNlbnRlclByb3ZpZGVyPlxyXG4gICAgPEFwcFNoZWxsXHJcbiAgICAgIGhlYWRlcj17eyBoZWlnaHQ6IHN0eWxlVG9rZW5zLnNoZWxsLmhlYWRlckhlaWdodCB9fVxyXG4gICAgICBuYXZiYXI9e3tcclxuICAgICAgICB3aWR0aDogeyBiYXNlOiBzdHlsZVRva2Vucy5zaGVsbC5uYXZiYXJXaWR0aCwgc206IGRlc2t0b3BOYXZiYXJXaWR0aCB9LFxyXG4gICAgICAgIGJyZWFrcG9pbnQ6ICdzbScsXHJcbiAgICAgICAgY29sbGFwc2VkOiB7IG1vYmlsZTogIW5hdk9wZW5lZCwgZGVza3RvcDogZmFsc2UgfSxcclxuICAgICAgfX1cclxuICAgICAgcGFkZGluZz17c3R5bGVUb2tlbnMuc2hlbGwubWFpblBhZGRpbmd9XHJcbiAgICAgIHN0eWxlcz17e1xyXG4gICAgICAgIGhlYWRlcjoge1xyXG4gICAgICAgICAgYm94U2hhZG93OiAnbm9uZScsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBuYXZiYXI6IHtcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3ZhcigtLW1hbnRpbmUtY29sb3ItYm9keSknLFxyXG4gICAgICAgICAgYm9yZGVyUmlnaHQ6ICcxcHggc29saWQgdmFyKC0tbWFudGluZS1jb2xvci1kZWZhdWx0LWJvcmRlciknLFxyXG4gICAgICAgICAgdG9wOiAwLFxyXG4gICAgICAgICAgaGVpZ2h0OiAnMTAwZHZoJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9fVxyXG4gICAgPlxyXG4gICAgICA8QXBwU2hlbGwuSGVhZGVyPlxyXG4gICAgICAgIDxUb3BDb21tYW5kQmFyXHJcbiAgICAgICAgICBuYXZPcGVuZWQ9e25hdk9wZW5lZH1cclxuICAgICAgICAgIG9uVG9nZ2xlTmF2PXt0b2dnbGVOYXZ9XHJcbiAgICAgICAgICBkZXNrdG9wTmF2T3BlbmVkPXtkZXNrdG9wTmF2T3BlbmVkfVxyXG4gICAgICAgICAgb25Ub2dnbGVEZXNrdG9wTmF2PXt0b2dnbGVEZXNrdG9wTmF2fVxyXG4gICAgICAgICAgc2hvd0Fzc2lzdGFudFRvZ2dsZT17YXNzaXN0YW50RG9ja0VuYWJsZWR9XHJcbiAgICAgICAgICBhc3Npc3RhbnRPcGVuZWQ9e2Fzc2lzdGFudE9wZW5lZH1cclxuICAgICAgICAgIG9uVG9nZ2xlQXNzaXN0YW50PXt0b2dnbGVBc3Npc3RhbnR9XHJcbiAgICAgICAgICBjb21wdXRlZENvbG9yU2NoZW1lPXtjb21wdXRlZENvbG9yU2NoZW1lfVxyXG4gICAgICAgICAgb25Ub2dnbGVDb2xvclNjaGVtZT17dG9nZ2xlQ29sb3JTY2hlbWV9XHJcbiAgICAgICAgLz5cclxuICAgICAgPC9BcHBTaGVsbC5IZWFkZXI+XHJcblxyXG4gICAgICA8QXBwU2hlbGwuTmF2YmFyXHJcbiAgICAgICAgcHg9ezB9XHJcbiAgICAgICAgcGI9ezB9XHJcbiAgICAgICAgcHQ9ezB9XHJcbiAgICAgID5cclxuICAgICAgICA8TGVmdFJhaWxcclxuICAgICAgICAgIG9uTmF2aWdhdGU9eygpID0+IHtcclxuICAgICAgICAgICAgY2xvc2VOYXYoKTtcclxuICAgICAgICAgIH19XHJcbiAgICAgICAgICB1c2VyTGFiZWw9e3Byb2ZpbGU/LmRpc3BsYXlfbmFtZSB8fCBwcm9maWxlPy5lbWFpbCB8fCB1c2VyPy5lbWFpbH1cclxuICAgICAgICAgIG9uU2lnbk91dD17aGFuZGxlU2lnbk91dH1cclxuICAgICAgICAgIGRlc2t0b3BDb21wYWN0PXshZGVza3RvcE5hdk9wZW5lZH1cclxuICAgICAgICAgIG9uVG9nZ2xlRGVza3RvcENvbXBhY3Q9e3RvZ2dsZURlc2t0b3BOYXZ9XHJcbiAgICAgICAgLz5cclxuICAgICAgPC9BcHBTaGVsbC5OYXZiYXI+XHJcblxyXG4gICAgICA8QXBwU2hlbGwuTWFpbiBzdHlsZT17bG9ja2VkTWFpblN0eWxlfT5cclxuICAgICAgICA8QXBwUGFnZVNoZWxsIG1vZGU9XCJmbHVpZFwiPlxyXG4gICAgICAgICAgPE91dGxldCAvPlxyXG4gICAgICAgIDwvQXBwUGFnZVNoZWxsPlxyXG4gICAgICA8L0FwcFNoZWxsLk1haW4+XHJcblxyXG4gICAgPC9BcHBTaGVsbD5cclxuXHJcbiAgICB7YXNzaXN0YW50RG9ja0VuYWJsZWQgJiYgYXNzaXN0YW50T3BlbmVkICYmICFhc3Npc3RhbnREZXRhY2hlZCAmJiAoXHJcbiAgICAgIDxQb3J0YWw+XHJcbiAgICAgICAgPEJveFxyXG4gICAgICAgICAgc3R5bGU9e3tcclxuICAgICAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXHJcbiAgICAgICAgICAgIHpJbmRleDogMzQwLFxyXG4gICAgICAgICAgICBib3R0b206IHJlbSgxMiksXHJcbiAgICAgICAgICAgIGxlZnQ6IGFzc2lzdGFudFNpZGUgPT09ICdsZWZ0JyA/IHJlbSgxMikgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIHJpZ2h0OiBhc3Npc3RhbnRTaWRlID09PSAncmlnaHQnID8gcmVtKDEyKSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgd2lkdGg6ICdtaW4oNTYwcHgsIGNhbGMoMTAwdncgLSAyNHB4KSknLFxyXG4gICAgICAgICAgICBoZWlnaHQ6ICdtaW4oNzh2aCwgODYwcHgpJyxcclxuICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiByZW0oMTIpLFxyXG4gICAgICAgICAgICBib3JkZXI6ICcxcHggc29saWQgcmdiYSgxNDgsIDE2MywgMTg0LCAwLjI4KScsXHJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJyMyOTMxM2MnLFxyXG4gICAgICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXHJcbiAgICAgICAgICAgIGJveFNoYWRvdzogJzAgMjRweCA2NHB4IHJnYmEoMCwgMCwgMCwgMC4zNCknLFxyXG4gICAgICAgICAgfX1cclxuICAgICAgICA+XHJcbiAgICAgICAgICA8QXNzaXN0YW50RG9ja0hvc3RcclxuICAgICAgICAgICAgb25DbG9zZT17Y2xvc2VBc3Npc3RhbnR9XHJcbiAgICAgICAgICAgIG9uRGV0YWNoPXt0b2dnbGVBc3Npc3RhbnREZXRhY2hlZH1cclxuICAgICAgICAgICAgb25Ub2dnbGVTaWRlPXt0b2dnbGVBc3Npc3RhbnRTaWRlfVxyXG4gICAgICAgICAgICBzaWRlPXthc3Npc3RhbnRTaWRlfVxyXG4gICAgICAgICAgLz5cclxuICAgICAgICA8L0JveD5cclxuICAgICAgPC9Qb3J0YWw+XHJcbiAgICApfVxyXG5cclxuICAgIHthc3Npc3RhbnREb2NrRW5hYmxlZCAmJiAoXHJcbiAgICAgIDxNb2RhbFxyXG4gICAgICAgIG9wZW5lZD17YXNzaXN0YW50T3BlbmVkICYmIGFzc2lzdGFudERldGFjaGVkfVxyXG4gICAgICAgIG9uQ2xvc2U9e2Nsb3NlQXNzaXN0YW50fVxyXG4gICAgICAgIHdpdGhDbG9zZUJ1dHRvbj17ZmFsc2V9XHJcbiAgICAgICAgY2VudGVyZWRcclxuICAgICAgICBzaXplPVwibWluKDExODBweCwgOTZ2dylcIlxyXG4gICAgICAgIHlPZmZzZXQ9XCIydmhcIlxyXG4gICAgICAgIG92ZXJsYXlQcm9wcz17eyBiYWNrZ3JvdW5kT3BhY2l0eTogMC4zMiwgYmx1cjogMiB9fVxyXG4gICAgICAgIHN0eWxlcz17e1xyXG4gICAgICAgICAgY29udGVudDoge1xyXG4gICAgICAgICAgICBib3JkZXI6ICcxcHggc29saWQgcmdiYSgxNDgsIDE2MywgMTg0LCAwLjI4KScsXHJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJyMyOTMxM2MnLFxyXG4gICAgICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keToge1xyXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9fVxyXG4gICAgICA+XHJcbiAgICAgICAgPEFzc2lzdGFudERvY2tIb3N0XHJcbiAgICAgICAgICBvbkNsb3NlPXtjbG9zZUFzc2lzdGFudH1cclxuICAgICAgICAgIG9uRGV0YWNoPXt0b2dnbGVBc3Npc3RhbnREZXRhY2hlZH1cclxuICAgICAgICAgIGRldGFjaGVkXHJcbiAgICAgICAgLz5cclxuICAgICAgPC9Nb2RhbD5cclxuICAgICl9XHJcblxyXG4gICAgPC9IZWFkZXJDZW50ZXJQcm92aWRlcj5cclxuICApO1xyXG59XHJcbiJdLCJmaWxlIjoiRTovd3JpdGluZy1zeXN0ZW0vd2ViL3NyYy9jb21wb25lbnRzL2xheW91dC9BcHBMYXlvdXQudHN4In0=

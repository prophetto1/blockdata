export type CaptureSessionStatus =
  | 'ready'
  | 'capturing'
  | 'browser-unreachable'
  | 'capture-failed'
  | 'directory-missing'
  | 'target-missing';

export type CaptureArtifactStatus = 'complete' | 'failed' | 'capturing';

export type CaptureSessionSummary = {
  id: string;
  name: string;
  status: CaptureSessionStatus;
  createdAt: string;
  updatedAt: string;
  lastCapturedAt: string | null;
  storageDirectoryLabel: string;
  captureCount: number;
  cdpEndpoint: string;
  debugPort: number | null;
  currentTargetUrl: string | null;
  currentTargetTitle: string | null;
};

export type CaptureSessionBrowser = {
  cdpEndpoint: string;
  debugPort: number | null;
  reachable: boolean;
  currentTargetUrl: string | null;
  currentTargetTitle: string | null;
  lastError: string | null;
};

export type CaptureBrowserTarget = {
  id: string;
  url: string | null;
  title: string | null;
};

export type CaptureArtifact = {
  id: string;
  status: CaptureArtifactStatus;
  capturedAt: string;
  pageUrl: string | null;
  pageTitle: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  reportRelativePath: string | null;
  viewportRelativePath: string | null;
  fullPageRelativePath: string | null;
};

export type CaptureSessionDetail = CaptureSessionSummary & {
  directoryHandleKey: string;
  target: CaptureBrowserTarget | null;
  browser: CaptureSessionBrowser;
  captures: CaptureArtifact[];
};

export type CreateBrowserCaptureSessionInput = {
  name?: string;
  cdpEndpoint: string;
  storageDirectoryLabel: string;
  directoryHandleKey: string;
};

export type CaptureSessionDefaults = {
  defaultSaveRoot: string;
  chromeExecutableDetected: boolean;
};

export type CreateCaptureSessionRequest = {
  name?: string;
  saveRoot?: string;
  launchUrl?: string;
};

export type CaptureWorkerStatus = {
  ok: boolean;
};

export type CaptureBrowserProbe = {
  reachable: boolean;
  currentTargetUrl: string | null;
  currentTargetTitle: string | null;
};

export type CaptureBinaryArtifact = {
  fileName: string;
  mimeType: string;
  base64: string;
};

export type CaptureWorkerResult = {
  captureId: string;
  capturedAt: string;
  pageUrl: string | null;
  pageTitle: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  currentTargetUrl: string | null;
  currentTargetTitle: string | null;
  report: unknown;
  reportFileName: string;
  viewportScreenshot: CaptureBinaryArtifact | null;
  fullPageScreenshot: CaptureBinaryArtifact | null;
};

export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type PageType = 'settings' | 'editor' | 'dashboard' | 'workbench' | 'marketing';

export type ThemeRequest = 'light' | 'dark';

export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  pageType: PageType;
  capturedAt: string | null;
  outputDir: string;
  status: CaptureStatus;
  hasOverlay?: boolean;
  overlayRequested?: boolean;
};

export type CaptureOverlayOptions = {
  triggerTextCandidates?: string[];
  triggerSelector?: string;
  overlaySelector?: string;
  dialogSelector?: string;
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
  pageType: PageType;
  forceAuth?: boolean;
  needsOverlayCapture?: boolean;
  overlayOptions?: CaptureOverlayOptions;
};
